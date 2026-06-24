import type {
  ImportStyle,
  StyleAtomController,
  StyleAtomCssReplacement,
  StyleAtomFiles,
  StyleAtomInlineStyle,
  StyleAtomOptions,
  StyleAtomSnapshot,
  StyleEncap,
} from "./types";

/**---
 * ## ![logo](https://github.com/voodoofugu/styled-atom/raw/main/src/assets/styled-atom-logo.png)
 * ### ***NormalizedEncapT***:
 * normalized wrapper settings used internally by the core store and React component.
 * @description
 * The normalized shape removes shorthand forms from `StyleEncap`, splits class names and makes wrapper decisions explicit.
 */
export type NormalizedEncapT = {
  enabled: boolean;
  classNames: string[];
  id?: string;
  attributes?: Record<string, string>;
  defaultSelector: boolean;
};

/**---
 * ## ![logo](https://github.com/voodoofugu/styled-atom/raw/main/src/assets/styled-atom-logo.png)
 * ### ***NormalizedStyleOptionsT***:
 * normalized style atom options.
 * @description
 * Used as the stable store representation for file names and wrapper options. Empty names are removed before the store creates cache keys.
 */
export type NormalizedStyleOptionsT = {
  files: string[];
  inlineStyle?: StyleAtomInlineStyle;
  encap: NormalizedEncapT;
};

type StyleEntryKindT = "file" | "inline";

type StyleEntryStatusT = "idle" | "loading" | "loaded" | "error";

type StyleEntryT = {
  key: string;
  kind: StyleEntryKindT;
  name: string;
  refs: Set<string>;
  status: StyleEntryStatusT;
  revision: number;
  css?: string;
  element?: HTMLStyleElement;
  error?: unknown;
};

type AtomStateT = {
  id: string;
  options: NormalizedStyleOptionsT;
  styleKeys: Set<string>;
  listeners: Set<() => void>;
  snapshot: StyleAtomSnapshot;
  snapshotKey: string;
};

const emptySnapshot = (id: string): StyleAtomSnapshot => ({
  id,
  loaded: false,
  loading: false,
  files: [],
  errors: [],
});

const compactList = (values?: StyleAtomFiles) => {
  const list = Array.isArray(values) ? values : values ? [values] : [];

  return list.filter(
    (value): value is string => typeof value === "string" && value.length > 0,
  );
};

const splitClassNames = (value?: string | string[]) => {
  const values = Array.isArray(value) ? value : value ? [value] : [];

  return values.flatMap((item) => item.split(/\s+/).filter(Boolean));
};

const normalizeEncap = (encap?: StyleEncap): NormalizedEncapT => {
  if (!encap) {
    return {
      enabled: false,
      classNames: [],
      defaultSelector: false,
    };
  }

  if (encap === true) {
    return {
      enabled: true,
      classNames: [],
      defaultSelector: true,
    };
  }

  if (typeof encap === "string") {
    return {
      enabled: true,
      classNames: splitClassNames(encap),
      defaultSelector: false,
    };
  }

  const classNames = splitClassNames(encap.className);
  const id = typeof encap.id === "string" ? encap.id.trim() : "";
  const attributes =
    typeof encap.attribute === "object" &&
    encap.attribute &&
    !Array.isArray(encap.attribute)
      ? Object.fromEntries(
          Object.entries(encap.attribute).filter(
            (entry): entry is [string, string] =>
              typeof entry[0] === "string" && typeof entry[1] === "string",
          ),
        )
      : undefined;
  const hasExplicitSelector =
    classNames.length > 0 ||
    Boolean(id) ||
    Boolean(attributes && Object.keys(attributes).length > 0);

  return {
    enabled: true,
    classNames,
    id: id || undefined,
    attributes:
      attributes && Object.keys(attributes).length ? attributes : undefined,
    defaultSelector: !hasExplicitSelector,
  };
};

const normalizeInlineStyle = (
  inlineStyle?: StyleAtomInlineStyle,
): StyleAtomInlineStyle | undefined => {
  const name =
    typeof inlineStyle?.name === "string" ? inlineStyle.name.trim() : "";

  if (!name || typeof inlineStyle?.css !== "string") return undefined;

  return {
    name,
    css: inlineStyle.css,
  };
};

/**---
 * ## ![logo](https://github.com/voodoofugu/styled-atom/raw/main/src/assets/styled-atom-logo.png)
 * ### ***normalizeStyleAtomOptions***:
 * normalize user-facing atom options.
 * @description
 * Converts shorthand `encap` values and removes empty file names.
 * @example
 * ```ts
 * const normalized = normalizeStyleAtomOptions({
 *   files: ["card", ""],
 *   encap: "customClass",
 * });
 * ```
 */
export const normalizeStyleAtomOptions = (
  options: StyleAtomOptions,
): NormalizedStyleOptionsT => ({
  files: compactList(options.files),
  inlineStyle: normalizeInlineStyle(options.inlineStyle),
  encap: normalizeEncap(options.encap),
});

const stableKey = (value: unknown) => JSON.stringify(value);

const getEncapKey = (encap: NormalizedEncapT) => ({
  enabled: encap.enabled,
  classNames: encap.classNames,
  id: encap.id ?? null,
  attributes: encap.attributes ?? null,
  defaultSelector: encap.defaultSelector,
});

/**---
 * ## ![logo](https://github.com/voodoofugu/styled-atom/raw/main/src/assets/styled-atom-logo.png)
 * ### ***getStyleAtomKey***:
 * create a stable content key for atom options.
 * @description
 * React uses this key to avoid store updates when inline arrays or objects contain the same normalized values. Host tooling can use it for memoization around atom options.
 * @example
 * ```ts
 * const key = getStyleAtomKey({
 *   files: ["card", "theme"],
 * });
 * ```
 */
export const getStyleAtomKey = (options: StyleAtomOptions) => {
  const normalized = normalizeStyleAtomOptions(options);

  return stableKey({
    files: normalized.files,
    inlineStyle: normalized.inlineStyle ?? null,
    encap: getEncapKey(normalized.encap),
  });
};

const cssEscape = (value: string) => {
  const cssApi = globalThis.CSS as
    | { escape?: (input: string) => string }
    | undefined;

  if (cssApi?.escape) {
    return cssApi.escape(value);
  }

  return value.replace(/(^-?\d|[^a-zA-Z0-9_-])/g, (part) => {
    const codePoint = part.codePointAt(0)?.toString(16) ?? "";
    return `\\${codePoint} `;
  });
};

const getFileStyleEntryKey = (file: string) =>
  stableKey({ kind: "file", file });

const getInlineStyleEntryKey = (name: string) =>
  stableKey({ kind: "inline", name });

const getContentClassNames = (options: NormalizedStyleOptionsT) => {
  if (!options.encap.enabled) return [];

  const classNames = options.encap.defaultSelector
    ? [
        ...options.encap.classNames,
        ...options.files,
        ...(options.inlineStyle ? [options.inlineStyle.name] : []),
      ]
    : [...options.encap.classNames];

  return Array.from(new Set(classNames.filter(Boolean)));
};

const cssStringEscape = (value: string) =>
  value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\a ");

const getContentSelector = (options: NormalizedStyleOptionsT) => {
  if (!options.encap.enabled) return null;

  const idSelector = options.encap.id ? `#${cssEscape(options.encap.id)}` : "";
  const attributeSelector = options.encap.attributes
    ? Object.entries(options.encap.attributes)
        .map(([name, value]) => {
          const attributeName = cssEscape(name);

          return value
            ? `[${attributeName}="${cssStringEscape(value)}"]`
            : `[${attributeName}]`;
        })
        .join("")
    : "";
  const classSelector = getContentClassNames(options)
    .map((className) => `.${cssEscape(className)}`)
    .join("");
  const selector = `${idSelector}${attributeSelector}${classSelector}`;

  return selector || null;
};

/**---
 * ## ![logo](https://github.com/voodoofugu/styled-atom/raw/main/src/assets/styled-atom-logo.png)
 * ### ***getStyledAtomWrapperProps***:
 * derive wrapper props from atom options.
 * @param options atom options that may include `encap`.
 * @description
 * Returns the same wrapper props used by the React `StyledAtom` component. Returns `null` when the atom does not need a wrapper.
 * @example
 * ```ts
 * const props = getStyledAtomWrapperProps(
 *   { files: "screen", encap: "customClass" }
 * );
 * ```
 */
export const getStyledAtomWrapperProps = (options: StyleAtomOptions) => {
  const normalized = normalizeStyleAtomOptions(options);

  if (!normalized.encap.enabled) return null;

  const classNames = getContentClassNames(normalized);
  const props: Record<string, string> = {};

  // attribute
  props["styled-atom-shell"] = "";

  if (normalized.encap.attributes) {
    for (const [name, value] of Object.entries(normalized.encap.attributes)) {
      props[name] = value;
    }
  }

  // id
  if (normalized.encap.id) {
    props.id = normalized.encap.id;
  }

  // class
  if (classNames.length > 0) {
    props.className = classNames.join(" ");
  }

  return props;
};

export const getStyledAtomWrapperSelector = (options: StyleAtomOptions) =>
  getContentSelector(normalizeStyleAtomOptions(options));

const isUsefulCssText = (value: string) => {
  const text = value.trim();

  return (
    text.length === 0 || (!/^\[object .+\]$/.test(text) && text !== "undefined")
  );
};

const coerceCssText = (value: unknown) => {
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object") return "";

  const toString = (value as { toString?: () => string }).toString;
  if (
    typeof toString !== "function" ||
    toString === Object.prototype.toString
  ) {
    return "";
  }

  const css = toString.call(value);

  return isUsefulCssText(css) ? css : "";
};

const normalizeLoaderResult = (value: unknown) => {
  const directCss = coerceCssText(value);
  if (directCss) return directCss;

  if (value && typeof value === "object" && "default" in value) {
    return coerceCssText((value as { default?: unknown }).default);
  }

  return "";
};

const isDevSourceUrlEnabled = () => {
  const runtime = globalThis as {
    process?: { env?: { NODE_ENV?: string } };
  };
  const nodeEnv = runtime.process?.env?.NODE_ENV;

  return nodeEnv !== "production";
};

const toSourceUrlName = (value: string) =>
  value.trim().replace(/[^a-zA-Z0-9._/-]+/g, "-") || "style";

const withStyleSourceUrl = (
  css: string,
  kind: StyleEntryKindT,
  name: string,
) => {
  if (!isDevSourceUrlEnabled() || /\/\*#\s*sourceURL=/.test(css)) {
    return css;
  }

  const separator = css.length > 0 && !css.endsWith("\n") ? "\n" : "";

  return `${css}${separator}/*# sourceURL=styled-atom/${kind}/${toSourceUrlName(
    name,
  )}.css */`;
};

const formatError = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

/**---
 * ## ![logo](https://github.com/voodoofugu/styled-atom/raw/main/src/assets/styled-atom-logo.png)
 * ### ***StyledAtomStore***:
 * internal DOM style store used by the React runtime.
 * @description
 * Owns DOM style tags, caches loaded CSS entries and notifies only the atoms affected by a changed style entry.
 * @example
 * ```ts
 * const store = new StyledAtomStore((name) => import(`./css/${name}.css`));
 *
 * const atom = store.preload(["reset", "theme"]);
 * atom.dispose();
 * ```
 */
export class StyledAtomStore {
  private path?: ImportStyle;
  private atoms = new Map<string, AtomStateT>();
  private styles = new Map<string, StyleEntryT>();
  private idCounter = 0;

  constructor(path?: ImportStyle) {
    this.path = path;
  }

  /**---
   * ## ![logo](https://github.com/voodoofugu/styled-atom/raw/main/src/assets/styled-atom-logo.png)
   * ### ***configure***:
   * update CSS loader after creation.
   * @description
   * Existing style entries are retried when a new loader is provided.
   * @example
   * ```ts
   * store.configure((name) => import(`./css/${name}.css`));
   * ```
   */
  configure(path?: ImportStyle) {
    const previousPath = this.path;
    this.path = path;

    if (path && path !== previousPath) {
      this.styles.forEach((entry) => {
        if (entry.kind !== "file") return;

        entry.status = "idle";
        entry.error = undefined;
        this.ensureStyleLoaded(entry);
      });
    } else {
      this.styles.forEach((entry) => {
        if (entry.kind === "file") this.ensureStyleLoaded(entry);
      });
    }
  }

  /**---
   * ## ![logo](https://github.com/voodoofugu/styled-atom/raw/main/src/assets/styled-atom-logo.png)
   * ### ***registerAtom***:
   * register one style atom and start loading its CSS entries.
   * @description
   * Keep the returned controller while the styles should stay mounted. Releasing it removes this atom's references and cleans up style tags that are no longer shared.
   * @returns controller for updating, subscribing, reloading and disposing the atom.
   * @example
   * ```ts
   * const atom = store.registerAtom({
   *   files: ["card", "theme"],
   * });
   * ```
   */
  registerAtom(
    options: StyleAtomOptions & { id?: string },
  ): StyleAtomController {
    const id = options.id ?? this.createId();

    if (!this.atoms.has(id)) {
      this.atoms.set(id, {
        id,
        options: normalizeStyleAtomOptions(options),
        styleKeys: new Set(),
        listeners: new Set(),
        snapshot: emptySnapshot(id),
        snapshotKey: "",
      });
    }

    this.updateAtom(id, options);

    return this.createController(id);
  }

  /**---
   * ## ![logo](https://github.com/voodoofugu/styled-atom/raw/main/src/assets/styled-atom-logo.png)
   * ### ***updateAtom***:
   * update one registered atom.
   * @description
   * Reconciles file references for the atom id without touching unrelated atoms in the store.
   */
  updateAtom(id: string, options: StyleAtomOptions) {
    const atom = this.atoms.get(id);
    if (!atom) return;

    const normalized = normalizeStyleAtomOptions(options);
    const nextKeys = new Set<string>();
    const nextEntries = normalized.files.map((file) => {
      const key = getFileStyleEntryKey(file);
      nextKeys.add(key);

      let entry = this.styles.get(key);

      if (!entry) {
        entry = {
          key,
          kind: "file",
          name: file,
          refs: new Set(),
          status: "idle",
          revision: 0,
        };
        this.styles.set(key, entry);
      }

      return entry;
    });

    if (normalized.inlineStyle) {
      const { name, css } = normalized.inlineStyle;
      const key = getInlineStyleEntryKey(name);
      nextKeys.add(key);

      let entry = this.styles.get(key);

      if (!entry) {
        entry = {
          key,
          kind: "inline",
          name,
          refs: new Set(),
          status: "idle",
          revision: 0,
          css,
        };
        this.styles.set(key, entry);
      } else if (entry.css !== css) {
        entry.css = css;
        entry.status = "idle";
        entry.error = undefined;
      }

      nextEntries.push(entry);
    }

    atom.styleKeys.forEach((key) => {
      if (!nextKeys.has(key)) {
        this.releaseStyleRef(key, id);
      }
    });

    nextEntries.forEach((entry) => {
      entry.refs.add(id);
      this.ensureStyleLoaded(entry);
    });

    atom.options = normalized;
    atom.styleKeys = nextKeys;
    this.refreshAtomSnapshot(atom);
  }

  /**---
   * ## ![logo](https://github.com/voodoofugu/styled-atom/raw/main/src/assets/styled-atom-logo.png)
   * ### ***unregisterAtom***:
   * dispose one atom by id.
   * @description
   * Releases the atom's style references, removes unused style tags and clears atom listeners.
   */
  unregisterAtom(id: string) {
    const atom = this.atoms.get(id);
    if (!atom) return;

    atom.styleKeys.forEach((key) => this.releaseStyleRef(key, id));
    atom.listeners.clear();
    this.atoms.delete(id);
  }

  /**---
   * ## ![logo](https://github.com/voodoofugu/styled-atom/raw/main/src/assets/styled-atom-logo.png)
   * ### ***subscribeAtom***:
   * subscribe to snapshot changes for one atom id.
   * @returns unsubscribe function.
   * @example
   * ```ts
   * const unsubscribe = store.subscribeAtom(atom.id, listener);
   * unsubscribe();
   * ```
   */
  subscribeAtom(id: string, listener: () => void) {
    const atom = this.atoms.get(id);
    if (!atom) return () => undefined;

    atom.listeners.add(listener);

    return () => {
      atom.listeners.delete(listener);
    };
  }

  /**---
   * ## ![logo](https://github.com/voodoofugu/styled-atom/raw/main/src/assets/styled-atom-logo.png)
   * ### ***getSnapshot***:
   * read the latest loading snapshot for one atom id.
   * @example
   * ```ts
   * const snapshot = store.getSnapshot(atom.id);
   * ```
   */
  getSnapshot(id: string): StyleAtomSnapshot {
    return this.atoms.get(id)?.snapshot ?? emptySnapshot(id);
  }

  /**---
   * ## ![logo](https://github.com/voodoofugu/styled-atom/raw/main/src/assets/styled-atom-logo.png)
   * ### ***preload***:
   * register styles without rendering React content.
   * @description
   * Use it for shared resets, themes or shell styles that should stay mounted while a tool surface is alive. Dispose the returned controller when those styles are no longer needed.
   * @example
   * ```ts
   * const preloaded = store.preload(["reset", "theme"]);
   * ```
   */
  preload(
    files: StyleAtomFiles,
    options: Omit<StyleAtomOptions, "files"> = {},
  ) {
    return this.registerAtom({
      ...options,
      id: this.createId("preload"),
      files,
    });
  }

  /**---
   * ## ![logo](https://github.com/voodoofugu/styled-atom/raw/main/src/assets/styled-atom-logo.png)
   * ### ***reload***:
   * reload registered style entries from the configured loader.
   * @description
   * When `files` is omitted every registered file entry is reloaded.
   */
  reload(files?: StyleAtomFiles) {
    const requested = new Set(compactList(files));

    this.styles.forEach((entry) => {
      if (entry.kind !== "file") return;
      if (requested.size > 0 && !requested.has(entry.name)) return;

      entry.status = "idle";
      entry.error = undefined;
      this.ensureStyleLoaded(entry);
    });
  }

  /**---
   * ## ![logo](https://github.com/voodoofugu/styled-atom/raw/main/src/assets/styled-atom-logo.png)
   * ### ***replace***:
   * replace CSS text for registered file entries.
   * @description
   * Updates matching mounted style tags without calling the loader. This is intended for dev-time style reload servers.
   * @example
   * ```ts
   * store.replace([{ file: "card", css: nextCss }]);
   * ```
   */
  replace(styles: readonly StyleAtomCssReplacement[]) {
    const replacements = new Map(
      styles
        .filter(
          (style): style is StyleAtomCssReplacement =>
            typeof style?.file === "string" &&
            style.file.length > 0 &&
            typeof style.css === "string",
        )
        .map((style) => [style.file, style.css]),
    );

    if (replacements.size === 0) return;

    this.styles.forEach((entry) => {
      if (entry.kind !== "file") return;

      const css = replacements.get(entry.name);
      if (css === undefined) return;

      const element = this.ensureStyleElement(entry);
      const nextCss = withStyleSourceUrl(css, entry.kind, entry.name);
      if (element && element.textContent !== nextCss) {
        element.textContent = nextCss;
      }

      entry.revision += 1;
      entry.status = "loaded";
      entry.error = undefined;
      this.refreshAtomsForStyle(entry);
    });
  }

  /**---
   * ## ![logo](https://github.com/voodoofugu/styled-atom/raw/main/src/assets/styled-atom-logo.png)
   * ### ***dispose***:
   * remove every atom and every style tag owned by this store.
   * @description
   * Use it when a workbench, preview iframe or custom tool surface is torn down.
   */
  dispose() {
    Array.from(this.atoms.keys()).forEach((id) => this.unregisterAtom(id));
    this.styles.forEach((entry) => entry.element?.remove());
    this.styles.clear();
  }

  private createController(id: string): StyleAtomController {
    return {
      id,
      update: (options) => this.updateAtom(id, options),
      subscribe: (listener) => this.subscribeAtom(id, listener),
      getSnapshot: () => this.getSnapshot(id),
      reload: () => this.reload(this.atoms.get(id)?.options.files),
      replace: (styles) => this.replace(styles),
      dispose: () => this.unregisterAtom(id),
    };
  }

  private createId(prefix = "atom") {
    this.idCounter += 1;
    return `styled-atom-${prefix}-${this.idCounter}`;
  }

  private releaseStyleRef(key: string, atomId: string) {
    const entry = this.styles.get(key);
    if (!entry) return;

    entry.refs.delete(atomId);

    if (entry.refs.size === 0) {
      entry.element?.remove();
      this.styles.delete(key);
    }
  }

  private ensureStyleElement(entry: StyleEntryT) {
    if (entry.element) return entry.element;

    const doc = typeof document === "undefined" ? undefined : document;
    const target = doc?.head;

    if (!doc || !target) return undefined;

    const element = doc.createElement("style");
    element.setAttribute(
      entry.kind === "file" ? "styled-atom-file" : "styled-atom-name",
      entry.name,
    );

    target.appendChild(element);
    entry.element = element;

    return element;
  }

  private ensureStyleLoaded(entry: StyleEntryT) {
    if (entry.kind === "inline") {
      const element = this.ensureStyleElement(entry);

      if (!element) {
        entry.status = "loaded";
        this.refreshAtomsForStyle(entry);
        return;
      }

      const css = withStyleSourceUrl(entry.css ?? "", entry.kind, entry.name);

      if (element.textContent !== css) {
        element.textContent = css;
      }

      entry.revision += 1;
      entry.status = "loaded";
      entry.error = undefined;
      this.refreshAtomsForStyle(entry);
      return;
    }

    if (
      entry.status === "loading" ||
      entry.status === "loaded" ||
      entry.status === "error"
    ) {
      return;
    }

    const element = this.ensureStyleElement(entry);

    if (!element) {
      entry.status = "loaded";
      this.refreshAtomsForStyle(entry);
      return;
    }

    const loader = this.path;

    if (!loader) {
      this.refreshAtomsForStyle(entry);
      return;
    }

    const revision = entry.revision + 1;
    entry.revision = revision;
    entry.status = "loading";
    entry.error = undefined;
    this.refreshAtomsForStyle(entry);

    Promise.resolve(loader(entry.name))
      .then((result) => {
        if (entry.revision !== revision) return;

        const css = withStyleSourceUrl(
          normalizeLoaderResult(result),
          entry.kind,
          entry.name,
        );

        if (element.textContent !== css) {
          element.textContent = css;
        }

        entry.status = "loaded";
        entry.error = undefined;
        this.refreshAtomsForStyle(entry);
      })
      .catch((error: unknown) => {
        if (entry.revision !== revision) return;

        element.textContent = `/* styled-atom failed to load "${entry.name}" */`;
        entry.status = "error";
        entry.error = error;
        this.refreshAtomsForStyle(entry);

        console.error(
          `Loading failed for "${entry.name}" style`,
          "\n",
          "styled-atom",
          "\n",
          error,
        );
      });
  }

  private refreshAtomsForStyle(entry: StyleEntryT) {
    entry.refs.forEach((atomId) => {
      const atom = this.atoms.get(atomId);
      if (atom) this.refreshAtomSnapshot(atom);
    });
  }

  private refreshAtomSnapshot(atom: AtomStateT) {
    const entries = Array.from(atom.styleKeys)
      .map((key) => this.styles.get(key))
      .filter((entry): entry is StyleEntryT => Boolean(entry));
    const errors = entries
      .filter((entry) => entry.kind === "file" && entry.status === "error")
      .map((entry) => ({ file: entry.name, error: entry.error }));
    const loading = entries.some(
      (entry) => entry.status === "idle" || entry.status === "loading",
    );
    const loaded =
      entries.length === 0 ||
      entries.every(
        (entry) => entry.status === "loaded" || entry.status === "error",
      );
    const snapshot: StyleAtomSnapshot = {
      id: atom.id,
      loaded,
      loading,
      files: atom.options.files,
      errors,
    };
    const snapshotKey = stableKey({
      loaded,
      loading,
      files: atom.options.files,
      errors: errors.map((error) => [error.file, formatError(error.error)]),
    });

    atom.snapshot = snapshot;

    if (snapshotKey !== atom.snapshotKey) {
      atom.snapshotKey = snapshotKey;
      atom.listeners.forEach((listener) => listener());
    }
  }
}
