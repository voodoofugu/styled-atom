import type {
  CollectedStyle,
  ImportStyle,
  InitialStyles,
  MountedStyle,
  StyleAtomController,
  StyleAtomCssReplacement,
  StyleAtomFiles,
  StyleAtomOptions,
  StyleAtomSnapshot,
  StyleCollector,
  StyleLoadError,
  StylePlacement,
  StyleRuntimeOptions,
  StyleRuntimeInspection,
  StyleRuntimeEntryInspection,
  StyleTarget,
  StyleTargetValue,
} from "./types";
import {
  findServerStyleCss,
  mountRegistryEntry,
  nextRuntimeNamespace,
  releaseRegistryEntry,
} from "./registry";
import { isDevelopmentEnvironment } from "./environment";

type EntryKind = "file" | "inline";
type EntryStatus = "idle" | "loading" | "ready" | "failed";

type NormalizedOptions = {
  files: string[];
  inlineStyle?: { name: string; css: string; signature?: string };
  placement: StylePlacement;
  target?: StyleTarget;
  nonce?: string;
  precedence?: number;
  targetError?: unknown;
};

type StyleEntry = {
  key: string;
  publicKey: string;
  kind: EntryKind;
  name: string;
  placement: StylePlacement;
  target?: StyleTarget;
  nonce?: string;
  precedence: number;
  refs: Set<string>;
  status: EntryStatus;
  revision: number;
  css?: string;
  signature?: string;
  error?: StyleLoadError;
  element?: HTMLStyleElement;
  registryOwner: object;
};

type AtomState = {
  id: string;
  sourceOptions: StyleAtomOptions<string>;
  options: NormalizedOptions;
  styleKeys: Set<string>;
  listeners: Set<() => void>;
  snapshot: StyleAtomSnapshot;
  snapshotKey: string;
  issue?: StyleLoadError;
};

const emptySnapshot = (id: string): StyleAtomSnapshot => ({
  id,
  status: "ready",
  files: [],
  errors: [],
  styles: [],
});

const compactList = <TFile extends string>(values?: StyleAtomFiles<TFile>) => {
  const list = Array.isArray(values) ? values : values ? [values] : [];
  return Array.from(
    new Set(
      list.filter(
        (value): value is TFile =>
          typeof value === "string" && value.trim().length > 0,
      ),
    ),
  );
};

const resolveTarget = (value?: StyleTargetValue) => {
  try {
    const target = typeof value === "function" ? value() : value;
    return { target: target ?? undefined };
  } catch (error) {
    return { target: undefined, error };
  }
};

const defaultTarget = (): StyleTarget | undefined =>
  typeof document === "undefined" ? undefined : document;

const normalizeLoaderResult = (value: unknown): string => {
  const stringify = (candidate: unknown) => {
    if (typeof candidate === "string") return candidate;
    if (!candidate || typeof candidate !== "object") return "";
    const method = (candidate as { toString?: () => string }).toString;
    if (typeof method !== "function" || method === Object.prototype.toString) {
      return "";
    }
    const text = method.call(candidate);
    return /^\[object .+\]$/.test(text) || text === "undefined" ? "" : text;
  };

  const direct = stringify(value);
  if (direct) return direct;
  if (value && typeof value === "object" && "default" in value) {
    return stringify((value as { default?: unknown }).default);
  }
  return "";
};

const defaultSourceUrl = isDevelopmentEnvironment;

const withSourceUrl = (
  enabled: boolean,
  css: string,
  kind: EntryKind,
  name: string,
) => {
  if (!enabled || /\/\*#\s*sourceURL=/.test(css)) return css;
  const safeName = name.trim().replace(/[^a-zA-Z0-9._/-]+/g, "-") || "style";
  const separator = css && !css.endsWith("\n") ? "\n" : "";
  return `${css}${separator}/*# sourceURL=styled-atom/${kind}/${safeName}.css */`;
};

const escapeAttribute = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

const escapeStyleText = (value: string) => value.replace(/<\/style/gi, "<\\/style");

/**---
 * ## ![logo](https://github.com/voodoofugu/styled-atom/raw/main/src/assets/styled-atom-logo.png)
 * ### ***createStyleCollector***:
 * creates an isolated style collector for one server-rendered request.
 */
export const createStyleCollector = (): StyleCollector => {
  const styles = new Map<string, CollectedStyle>();

  const getStyles = () =>
    Array.from(styles.values()).sort(
      (a, b) => a.precedence - b.precedence || a.key.localeCompare(b.key),
    );

  return {
    collect(style) {
      const collectionKey = `${style.namespace}\u0000${style.key}`;
      const existing = styles.get(collectionKey);
      if (existing && existing.css !== style.css) {
        throw new Error(
          `[styled-atom] Collected style "${style.name}" has conflicting CSS.`,
        );
      }
      styles.set(collectionKey, {
        ...style,
        signature:
          existing && existing.signature !== style.signature
            ? undefined
            : style.signature,
      });
    },
    getStyles,
    getStyleTags() {
      return getStyles()
        .map((style) => {
          const nonce = style.nonce
            ? ` nonce="${escapeAttribute(style.nonce)}"`
            : "";
          return `<style data-styled-atom-namespace="${escapeAttribute(
            style.namespace,
          )}" data-styled-atom-key="${escapeAttribute(
            style.key,
          )}" data-styled-atom-precedence="${style.precedence}"${
            style.signature
              ? ` data-styled-atom-signature="${escapeAttribute(style.signature)}"`
              : ""
          }${nonce}>${escapeStyleText(
            style.css,
          )}</style>`;
        })
        .join("");
    },
    clear: () => styles.clear(),
  };
};

/**---
 * ## ![logo](https://github.com/voodoofugu/styled-atom/raw/main/src/assets/styled-atom-logo.png)
 * ### ***StyleRuntime***:
 * framework-agnostic owner of file and inline CSS atoms. One runtime shares,
 * orders and releases CSS across every atom registered through it.
 */
export class StyleRuntime<TFile extends string = string> {
  /** Namespace used to coordinate ownership in the target document. */
  readonly namespace: string;

  private loader?: ImportStyle<TFile>;
  private runtimeTarget?: StyleTargetValue;
  private defaultPlacement: StylePlacement;
  private sourceURL: boolean;
  private defaultNonce?: string;
  private onError?: (error: StyleLoadError) => void;
  private initialStyles = new Map<string, string>();
  private order = new Map<string, number>();
  private atoms = new Map<string, AtomState>();
  private entries = new Map<string, StyleEntry>();
  private targetIds = new WeakMap<object, number>();
  private inlineDefinitions = new Map<string, { css: string; refs: Set<string> }>();
  private targetCounter = 0;
  private idCounter = 0;

  /** Creates a runtime with shared defaults for its atoms. */
  constructor(options: StyleRuntimeOptions<TFile> = {}) {
    this.namespace = options.namespace?.trim() || nextRuntimeNamespace();
    this.loader = options.loader;
    this.runtimeTarget = options.target;
    this.defaultPlacement = options.placement ?? "head";
    this.sourceURL = options.sourceURL ?? defaultSourceUrl();
    this.defaultNonce = options.nonce;
    this.onError = options.onError;
    this.setOrder(options.order);
    this.setInitialStyles(options.initialStyles);
  }

  /** Updates runtime defaults and reconciles every registered atom. */
  configure(options: Partial<StyleRuntimeOptions<TFile>>) {
    const sourceURLChanged =
      "sourceURL" in options &&
      this.sourceURL !== (options.sourceURL ?? defaultSourceUrl());
    if ("loader" in options) this.loader = options.loader;
    if ("target" in options) this.runtimeTarget = options.target;
    if ("placement" in options && options.placement)
      this.defaultPlacement = options.placement;
    if ("sourceURL" in options)
      this.sourceURL = options.sourceURL ?? defaultSourceUrl();
    if ("nonce" in options) this.defaultNonce = options.nonce;
    if ("onError" in options) this.onError = options.onError;
    if (options.order) this.setOrder(options.order);
    if (options.initialStyles) this.setInitialStyles(options.initialStyles);
    this.atoms.forEach((atom) => {
      this.updateAtom(atom.id, atom.sourceOptions as StyleAtomOptions<TFile>);
    });
    if (sourceURLChanged) {
      this.entries.forEach((entry) => {
        if (entry.status === "ready" && entry.css !== undefined) {
          this.commitEntry(entry);
        }
      });
    }
  }

  /** Resolves an atom placement against the runtime default. */
  resolvePlacement(placement?: StylePlacement) {
    return placement ?? this.defaultPlacement;
  }

  /** Resolves an atom CSP nonce against the runtime default. */
  resolveNonce(nonce?: string) {
    return nonce ?? this.defaultNonce;
  }

  /** @internal Returns matching server CSS to skip hydration compilation. */
  resolveHydratedInlineStyle(
    name: string,
    options: Pick<
      StyleAtomOptions<TFile>,
      "placement" | "target" | "precedence"
    > = {},
  ) {
    const normalized = this.normalize({
      ...options,
      inlineStyle: { name, css: "" },
    });
    const precedence = this.precedenceFor(name, normalized.precedence);
    return findServerStyleCss({
      target: normalized.target,
      placement: normalized.placement,
      namespace: this.namespace,
      publicKey: this.publicKey("inline", name, precedence),
    });
  }

  /** Returns a read-only diagnostic report without exposing mutable state. */
  inspect(): StyleRuntimeInspection {
    return {
      namespace: this.namespace,
      atoms: this.atoms.size,
      entries: Array.from(this.entries.values())
        .map((entry) => ({
          key: entry.publicKey,
          name: entry.name,
          kind: entry.kind,
          status: entry.status === "idle" ? "loading" : entry.status,
          placement: entry.placement,
          target: this.describeTarget(entry),
          precedence: entry.precedence,
          localOwners: entry.refs.size,
          cssLength: entry.css?.length ?? 0,
          error: entry.error,
        }))
        .sort(
          (first, second) =>
            first.precedence - second.precedence ||
            first.key.localeCompare(second.key),
        ),
    };
  }

  /** Builds the synchronous snapshot used by SSR and React hydration. */
  getServerSnapshot(id: string, options: StyleAtomOptions<TFile>) {
    const normalized = this.normalize(options);
    const styles: MountedStyle[] = [];
    let missing = false;

    normalized.files.forEach((name) => {
      const css = this.initialStyles.get(name);
      if (css === undefined) missing = true;
      else {
        styles.push({
          key: this.publicKey(
            "file",
            name,
            this.precedenceFor(name, normalized.precedence),
          ),
          kind: "file",
          name,
          css: withSourceUrl(this.sourceURL, css, "file", name),
          precedence: this.precedenceFor(name, normalized.precedence),
        });
      }
    });

    if (normalized.inlineStyle) {
      const { name, css, signature } = normalized.inlineStyle;
      styles.push({
        key: this.publicKey(
          "inline",
          name,
          this.precedenceFor(name, normalized.precedence),
        ),
        kind: "inline",
        name,
        css: withSourceUrl(this.sourceURL, css, "inline", name),
        signature,
        precedence: this.precedenceFor(name, normalized.precedence),
      });
    }

    return {
      id,
      status: missing ? "loading" : "ready",
      files: normalized.files,
      errors: [],
      styles,
    } satisfies StyleAtomSnapshot;
  }

  /** Adds ready head styles from a snapshot to an SSR collector. */
  collect(collector: StyleCollector, snapshot: StyleAtomSnapshot, nonce?: string) {
    snapshot.styles.forEach((style) => {
      collector.collect({
        ...style,
        namespace: this.namespace,
        nonce: nonce ?? this.defaultNonce,
      });
    });
  }

  /** Registers one style owner and returns its imperative controller. */
  registerAtom(options: StyleAtomOptions<TFile> & { id?: string }): StyleAtomController<TFile> {
    const id = options.id ?? this.createId();
    if (!this.atoms.has(id)) {
      this.atoms.set(id, {
        id,
        sourceOptions: options,
        options: this.normalize(options),
        styleKeys: new Set(),
        listeners: new Set(),
        snapshot: emptySnapshot(id),
        snapshotKey: "",
      });
    }
    this.updateAtom(id, options);
    return this.createController(id);
  }

  /** Keeps named file atoms mounted until the returned controller is disposed. */
  preload(files: StyleAtomFiles<TFile>, options: Omit<StyleAtomOptions<TFile>, "files"> = {}) {
    return this.registerAtom({ ...options, files, id: this.createId("preload") });
  }

  /** Reloads selected mounted file atoms, or every mounted file when omitted. */
  reload(files?: StyleAtomFiles<TFile>) {
    const requested = new Set(compactList(files));
    this.entries.forEach((entry) => {
      if (entry.kind !== "file") return;
      if (requested.size && !requested.has(entry.name as TFile)) return;
      entry.status = "idle";
      entry.error = undefined;
      this.ensureLoaded(entry);
    });
  }

  /** Retries failed entries for one atom, or every failed entry when omitted. */
  retry(id?: string) {
    const atom = id ? this.atoms.get(id) : undefined;
    const keys = atom?.styleKeys;
    this.entries.forEach((entry, key) => {
      if (keys && !keys.has(key)) return;
      if (entry.status !== "failed") return;
      entry.status = "idle";
      entry.error = undefined;
      this.ensureLoaded(entry);
    });
    if (atom?.issue) {
      atom.issue = undefined;
      this.updateAtom(id!, atom.sourceOptions as StyleAtomOptions<TFile>);
    }
  }

  /** Replaces mounted file CSS without calling the configured loader. */
  replace(styles: readonly StyleAtomCssReplacement<TFile>[]) {
    const replacements = new Map(
      styles
        .filter((item) => typeof item?.file === "string" && typeof item.css === "string")
        .map((item) => [item.file, item.css]),
    );
    this.entries.forEach((entry) => {
      if (entry.kind !== "file") return;
      const css = replacements.get(entry.name as TFile);
      if (css === undefined) return;
      entry.revision += 1;
      entry.css = css;
      entry.error = undefined;
      this.commitEntry(entry);
    });
  }

  /** Releases every atom and DOM ownership reference held by this runtime. */
  dispose() {
    Array.from(this.atoms.keys()).forEach((id) => this.unregisterAtom(id));
    this.entries.clear();
    this.inlineDefinitions.clear();
  }

  private normalize(options: StyleAtomOptions<TFile>): NormalizedOptions {
    const targetValue = options.target ?? this.runtimeTarget;
    const resolvedTarget = resolveTarget(targetValue);
    const placement = options.placement ?? this.defaultPlacement;
    const explicitTarget = targetValue !== undefined;
    const name = options.inlineStyle?.name.trim() ?? "";
    return {
      files: compactList(options.files),
      inlineStyle:
        name && typeof options.inlineStyle?.css === "string"
          ? {
              name,
              css: options.inlineStyle.css,
              signature: options.inlineStyle.signature,
            }
          : undefined,
      placement,
      target: resolvedTarget.target ?? (explicitTarget ? undefined : defaultTarget()),
      nonce: options.nonce ?? this.defaultNonce,
      precedence: options.precedence,
      targetError:
        placement === "head" && explicitTarget && !resolvedTarget.target
          ? resolvedTarget.error ??
            new Error("[styled-atom] The configured style target is not available.")
          : undefined,
    };
  }

  private updateAtom(id: string, options: StyleAtomOptions<TFile>) {
    const atom = this.atoms.get(id);
    if (!atom) return;
    const normalized = this.normalize(options);
    const nextKeys = new Set<string>();
    const nextEntries: StyleEntry[] = [];
    atom.issue = undefined;

    if (normalized.targetError) {
      atom.issue = this.reportError({
        code: "target",
        source: "target",
        error: normalized.targetError,
      });
    }

    if (!atom.issue) normalized.files.forEach((name) => {
      const entry = this.getOrCreateEntry("file", name, normalized);
      nextKeys.add(entry.key);
      nextEntries.push(entry);
    });

    if (normalized.inlineStyle && !atom.issue) {
      const { name, css, signature } = normalized.inlineStyle;
      const definition = this.inlineDefinitions.get(name);
      const canReplaceOwnDefinition =
        definition?.refs.size === 1 && definition.refs.has(id);
      if (definition && definition.css !== css && !canReplaceOwnDefinition) {
        atom.issue = this.reportError({
          code: "conflict",
          source: name,
          error: new Error(
            `[styled-atom] Inline style "${name}" is already mounted with different CSS. Use a unique name or identical styles.`,
          ),
        });
      } else {
        const nextDefinition = definition ?? { css, refs: new Set<string>() };
        nextDefinition.css = css;
        nextDefinition.refs.add(id);
        this.inlineDefinitions.set(name, nextDefinition);
        const entry = this.getOrCreateEntry("inline", name, normalized, css);
        if (entry.css !== css) {
          entry.css = css;
          entry.status = "idle";
          entry.error = undefined;
        }
        entry.signature = signature;
        nextKeys.add(entry.key);
        nextEntries.push(entry);
      }
    }

    atom.styleKeys.forEach((key) => {
      if (!nextKeys.has(key)) this.releaseEntry(key, id);
    });
    nextEntries.forEach((entry) => {
      entry.refs.add(id);
      this.ensureLoaded(entry);
    });
    if (
      atom.options.inlineStyle?.name &&
      atom.options.inlineStyle.name !== normalized.inlineStyle?.name
    ) {
      this.releaseInline(atom.options.inlineStyle.name, id);
    }
    atom.sourceOptions = options;
    atom.options = normalized;
    atom.styleKeys = nextKeys;
    this.refreshSnapshot(atom);
  }

  private getOrCreateEntry(
    kind: EntryKind,
    name: string,
    options: NormalizedOptions,
    css?: string,
  ) {
    const targetId = options.placement === "head" ? this.idForTarget(options.target) : "inline";
    const key = `${kind}:${name}:${options.placement}:${targetId}:${options.precedence ?? "default"}`;
    let entry = this.entries.get(key);
    if (!entry) {
      entry = {
        key,
        publicKey: this.publicKey(
          kind,
          name,
          this.precedenceFor(name, options.precedence),
        ),
        kind,
        name,
        placement: options.placement,
        target: options.target,
        nonce: options.nonce,
        precedence: this.precedenceFor(name, options.precedence),
        refs: new Set(),
        status: "idle",
        revision: 0,
        css,
        signature: options.inlineStyle?.signature,
        registryOwner: {},
      };
      this.entries.set(key, entry);
    }
    return entry;
  }

  private ensureLoaded(entry: StyleEntry) {
    if (entry.status === "loading" || entry.status === "ready") return;
    if (entry.kind === "inline") {
      this.commitEntry(entry);
      return;
    }

    const initial = this.initialStyles.get(entry.name);
    if (entry.revision === 0 && initial !== undefined) {
      entry.css = initial;
      this.commitEntry(entry);
      return;
    }
    if (!this.loader) {
      entry.status = "failed";
      entry.error = this.reportError({
        code: "load",
        source: entry.name,
        error: new Error(`[styled-atom] No CSS loader is configured for "${entry.name}".`),
      });
      this.refreshAtoms(entry);
      return;
    }

    const revision = entry.revision + 1;
    entry.revision = revision;
    entry.status = "loading";
    entry.error = undefined;
    this.refreshAtoms(entry);
    Promise.resolve(this.loader(entry.name as TFile))
      .then((result) => {
        if (entry.revision !== revision || !this.entries.has(entry.key)) return;
        entry.css = normalizeLoaderResult(result);
        this.commitEntry(entry);
      })
      .catch((error: unknown) => {
        if (entry.revision !== revision || !this.entries.has(entry.key)) return;
        entry.status = "failed";
        entry.error = this.reportError({ code: "load", source: entry.name, error });
        this.refreshAtoms(entry);
      });
  }

  private commitEntry(entry: StyleEntry) {
    entry.status = "ready";
    entry.error = undefined;
    if (entry.placement === "head") {
      const result = mountRegistryEntry({
        namespace: this.namespace,
        publicKey: entry.publicKey,
        kind: entry.kind,
        name: entry.name,
        precedence: entry.precedence,
        css: withSourceUrl(
          this.sourceURL,
          entry.css ?? "",
          entry.kind,
          entry.name,
        ),
        signature: entry.signature,
        nonce: entry.nonce,
        target: entry.target,
        owner: entry.registryOwner,
      });
      if (result.error) {
        entry.status = "failed";
        entry.error = this.reportError(result.error);
      } else {
        entry.element = result.element;
      }
    }
    this.refreshAtoms(entry);
  }

  private refreshAtoms(entry: StyleEntry) {
    entry.refs.forEach((id) => {
      const atom = this.atoms.get(id);
      if (atom) this.refreshSnapshot(atom);
    });
  }

  private refreshSnapshot(atom: AtomState) {
    const entries = Array.from(atom.styleKeys)
      .map((key) => this.entries.get(key))
      .filter((entry): entry is StyleEntry => Boolean(entry));
    const errors = [
      ...(atom.issue ? [atom.issue] : []),
      ...entries.flatMap((entry) => (entry.error ? [entry.error] : [])),
    ];
    const status = errors.length
      ? "failed"
      : entries.some((entry) => entry.status === "idle" || entry.status === "loading")
        ? "loading"
        : "ready";
    const styles = entries.flatMap<MountedStyle>((entry) =>
      entry.status === "ready" && entry.css !== undefined
        ? [{
            key: entry.publicKey,
            kind: entry.kind,
            name: entry.name,
            css: withSourceUrl(
              this.sourceURL,
              entry.css,
              entry.kind,
              entry.name,
            ),
            signature: entry.signature,
            precedence: entry.precedence,
          }]
        : [],
    );
    const snapshot: StyleAtomSnapshot = {
      id: atom.id,
      status,
      files: atom.options.files,
      errors,
      styles,
    };
    const snapshotKey = JSON.stringify({
      status,
      files: atom.options.files,
      errors: errors.map((item) => [item.code, item.source, String(item.error)]),
      styles: styles.map((style) => [style.key, style.css]),
    });
    atom.snapshot = snapshot;
    if (snapshotKey !== atom.snapshotKey) {
      atom.snapshotKey = snapshotKey;
      atom.listeners.forEach((listener) => listener());
    }
  }

  private createController(id: string): StyleAtomController<TFile> {
    return {
      id,
      update: (options) => this.updateAtom(id, options),
      subscribe: (listener) => {
        const atom = this.atoms.get(id);
        if (!atom) return () => undefined;
        atom.listeners.add(listener);
        return () => atom.listeners.delete(listener);
      },
      getSnapshot: () => this.atoms.get(id)?.snapshot ?? emptySnapshot(id),
      reload: () => this.reload(this.atoms.get(id)?.options.files as TFile[]),
      retry: () => this.retry(id),
      replace: (styles) => this.replace(styles),
      dispose: () => this.unregisterAtom(id),
    };
  }

  private unregisterAtom(id: string) {
    const atom = this.atoms.get(id);
    if (!atom) return;
    atom.styleKeys.forEach((key) => this.releaseEntry(key, id));
    if (atom.options.inlineStyle) {
      this.releaseInline(atom.options.inlineStyle.name, id);
    }
    atom.listeners.clear();
    this.atoms.delete(id);
  }

  private releaseEntry(key: string, id: string) {
    const entry = this.entries.get(key);
    if (!entry) return;
    entry.refs.delete(id);
    if (entry.refs.size === 0) {
      entry.revision += 1;
      if (entry.placement === "head") {
        releaseRegistryEntry({
          namespace: this.namespace,
          publicKey: entry.publicKey,
          target: entry.target,
          owner: entry.registryOwner,
        });
      }
      this.entries.delete(key);
    }
  }

  private releaseInline(name: string, id: string) {
    const definition = this.inlineDefinitions.get(name);
    if (!definition) return;
    definition.refs.delete(id);
    if (definition.refs.size === 0) this.inlineDefinitions.delete(name);
  }

  private setOrder(order?: readonly TFile[]) {
    this.order.clear();
    order?.forEach((name, index) => this.order.set(name, index));
  }

  private setInitialStyles(styles?: InitialStyles<TFile>) {
    if (!styles) return;
    Object.entries(styles).forEach(([name, css]) => {
      if (typeof css === "string") this.initialStyles.set(name, css);
    });
  }

  private precedenceFor(name: string, explicit?: number) {
    return explicit ?? this.order.get(name) ?? 10_000;
  }

  private publicKey(kind: EntryKind, name: string, precedence: number) {
    return `${kind}:${name}:${precedence}`;
  }

  private idForTarget(target?: StyleTarget) {
    const value = target ?? defaultTarget();
    if (!value) return "server";
    let id = this.targetIds.get(value);
    if (!id) {
      this.targetCounter += 1;
      id = this.targetCounter;
      this.targetIds.set(value, id);
    }
    return String(id);
  }

  private describeTarget(entry: StyleEntry): StyleRuntimeEntryInspection["target"] {
    if (entry.placement === "inline") return "inline";
    if (!entry.target) return "server";
    if (entry.target.nodeType === 9) return "document";
    if (entry.target.nodeType === 11) return "shadow-root";
    return "element";
  }

  private reportError(error: StyleLoadError) {
    this.onError?.(error);
    return error;
  }

  private createId(prefix = "atom") {
    this.idCounter += 1;
    return `${this.namespace}-${prefix}-${this.idCounter}`;
  }
}

/**---
 * ## ![logo](https://github.com/voodoofugu/styled-atom/raw/main/src/assets/styled-atom-logo.png)
 * ### ***createStyleRuntime***:
 * creates a framework-agnostic style runtime.
 */
export const createStyleRuntime = <TFile extends string = string>(
  options: StyleRuntimeOptions<TFile> = {},
) => new StyleRuntime(options);
