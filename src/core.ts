import type {
  StyleAtomControllerT,
  StyleAtomCssReplacementT,
  StyleAtomOptionsT,
  StyleAtomSnapshotT,
  StyleEncapT,
  StyledAtomStoreOptionsT,
} from "./types";

export type NormalizedEncapT = {
  content: boolean;
  classNames: string[];
  id?: string;
  attributes?: Record<string, string>;
  defaultSelector: boolean;
};

export type NormalizedStyleOptionsT = {
  fileNames: string[];
  encap: NormalizedEncapT;
  layer?: string;
  css: string;
};

type StyleEntryStatusT = "idle" | "loading" | "loaded" | "error";

type StyleEntryT = {
  key: string;
  fileName: string;
  inline: boolean;
  options: NormalizedStyleOptionsT;
  refs: Set<string>;
  status: StyleEntryStatusT;
  revision: number;
  element?: HTMLStyleElement;
  error?: unknown;
};

type AtomStateT = {
  id: string;
  options: NormalizedStyleOptionsT;
  styleKeys: Set<string>;
  listeners: Set<() => void>;
  snapshot: StyleAtomSnapshotT;
  snapshotKey: string;
};

const emptySnapshot = (id: string): StyleAtomSnapshotT => ({
  id,
  loaded: false,
  loading: false,
  fileNames: [],
  errors: [],
});

const compactList = (values?: readonly string[]) =>
  Array.isArray(values)
    ? values.filter(
        (value): value is string =>
          typeof value === "string" && value.length > 0,
      )
    : [];

const normalizeLayer = (layer?: string) => {
  const value = typeof layer === "string" ? layer.trim() : "";
  return value || undefined;
};

const splitClassNames = (value?: string | string[]) => {
  const values = Array.isArray(value) ? value : value ? [value] : [];

  return values.flatMap((item) => item.split(/\s+/).filter(Boolean));
};

const normalizeEncap = (encap?: StyleEncapT): NormalizedEncapT => {
  if (!encap) {
    return {
      content: false,
      classNames: [],
      defaultSelector: false,
    };
  }

  if (encap === true || typeof encap === "string") {
    return {
      content: true,
      classNames: splitClassNames(
        typeof encap === "string" ? encap : undefined,
      ),
      defaultSelector: true,
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

  return {
    content: encap.content ?? encap.wrap ?? true,
    classNames,
    id: id || undefined,
    attributes:
      attributes && Object.keys(attributes).length ? attributes : undefined,
    defaultSelector: false,
  };
};

const normalizeCss = (css?: string) =>
  typeof css === "string" ? css.trim() : "";

export const normalizeStyleAtomOptions = (
  options: StyleAtomOptionsT,
): NormalizedStyleOptionsT => ({
  fileNames: compactList(options.fileNames),
  encap: normalizeEncap(options.encap),
  layer: normalizeLayer(options.layer),
  css: normalizeCss(options.css),
});

const stableKey = (value: unknown) => JSON.stringify(value);

const getEncapKey = (encap: NormalizedEncapT) => ({
  content: encap.content,
  classNames: encap.classNames,
  id: encap.id ?? null,
  attributes: encap.attributes ?? null,
  defaultSelector: encap.defaultSelector,
});

export const getStyleAtomKey = (options: StyleAtomOptionsT) => {
  const normalized = normalizeStyleAtomOptions(options);

  return stableKey({
    fileNames: normalized.fileNames,
    encap: getEncapKey(normalized.encap),
    layer: normalized.layer ?? null,
    css: normalized.css || null,
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

const getStyleEntryKey = (fileName: string, options: NormalizedStyleOptionsT) =>
  stableKey({
    fileName,
    layer: options.layer ?? null,
    css: options.css || null,
  });

const getContentClassNames = (options: NormalizedStyleOptionsT) => {
  if (!options.encap.content) return [];

  const classNames = options.encap.defaultSelector
    ? [
        ...options.encap.classNames,
        ...options.fileNames.map((name) => cssEscape(name)),
      ]
    : [...options.encap.classNames];

  return Array.from(new Set(classNames.filter(Boolean)));
};

export const getStyledAtomWrapperProps = (
  options: StyleAtomOptionsT,
  id: string,
) => {
  const normalized = normalizeStyleAtomOptions(options);

  if (!normalized.encap.content) return null;

  const classNames = getContentClassNames(normalized);
  const props: Record<string, string> = {};

  // attribute
  props["styled-atom-shell"] = id;

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

const createCssText = (entry: StyleEntryT, css: string) => {
  const additionalCss = entry.options.css;
  const cssText = [additionalCss, css].filter(Boolean).join("\n");

  return entry.options.layer
    ? `@layer ${entry.options.layer}{${cssText}}`
    : cssText;
};

const formatError = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

/**
 * Framework-agnostic style store. It owns DOM style tags, caches loaded CSS and
 * notifies only the atoms affected by a changed style entry.
 */
export class StyledAtomStore {
  private options: StyledAtomStoreOptionsT;
  private atoms = new Map<string, AtomStateT>();
  private styles = new Map<string, StyleEntryT>();
  private layerOrderElement?: HTMLStyleElement;
  private idCounter = 0;

  constructor(options: StyledAtomStoreOptionsT = {}) {
    this.options = options;
    this.ensureLayerOrder();
  }

  /**
   * Updates the store loader or DOM target. Existing style entries are retried
   * when a new loader is provided.
   */
  configure(options: StyledAtomStoreOptionsT) {
    const previousPath = this.options.path;
    this.options = { ...this.options, ...options };
    this.ensureLayerOrder();

    if (options.path && options.path !== previousPath) {
      this.styles.forEach((entry) => {
        entry.status = "idle";
        entry.error = undefined;
        this.ensureStyleLoaded(entry);
      });
    } else {
      this.styles.forEach((entry) => this.ensureStyleLoaded(entry));
    }
  }

  /**
   * Registers a style atom and starts loading the requested CSS entries.
   *
   * Keep the returned controller while the styles should stay mounted.
   */
  registerAtom(
    options: StyleAtomOptionsT & { id?: string },
  ): StyleAtomControllerT {
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

  /** Updates one atom without touching unrelated atoms in the store. */
  updateAtom(id: string, options: StyleAtomOptionsT) {
    const atom = this.atoms.get(id);
    if (!atom) return;

    const normalized = normalizeStyleAtomOptions(options);
    const nextKeys = new Set<string>();
    const styleFileNames =
      normalized.fileNames.length > 0
        ? normalized.fileNames
        : normalized.css
          ? [`inline-${id}`]
          : [];
    const nextEntries = styleFileNames.map((fileName) => {
      const key = getStyleEntryKey(fileName, normalized);
      nextKeys.add(key);

      let entry = this.styles.get(key);

      if (!entry) {
        entry = {
          key,
          fileName,
          inline: normalized.fileNames.length === 0,
          options: normalized,
          refs: new Set(),
          status: "idle",
          revision: 0,
        };
        this.styles.set(key, entry);
      }

      return entry;
    });

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

  /** Disposes one atom and releases its style tag references. */
  unregisterAtom(id: string) {
    const atom = this.atoms.get(id);
    if (!atom) return;

    atom.styleKeys.forEach((key) => this.releaseStyleRef(key, id));
    atom.listeners.clear();
    this.atoms.delete(id);
  }

  /** Subscribes to snapshot changes for one atom id. */
  subscribeAtom(id: string, listener: () => void) {
    const atom = this.atoms.get(id);
    if (!atom) return () => undefined;

    atom.listeners.add(listener);

    return () => {
      atom.listeners.delete(listener);
    };
  }

  /** Returns the latest loading snapshot for one atom id. */
  getSnapshot(id: string): StyleAtomSnapshotT {
    return this.atoms.get(id)?.snapshot ?? emptySnapshot(id);
  }

  /**
   * Registers styles without rendering React content.
   *
   * Dispose the returned controller when the preloaded styles are no longer
   * needed.
   */
  preload(
    fileNames: readonly string[],
    options: Omit<StyleAtomOptionsT, "fileNames"> = {},
  ) {
    return this.registerAtom({
      ...options,
      id: this.createId("preload"),
      fileNames,
    });
  }

  /** Reloads already registered style entries from the configured loader. */
  reload(fileNames?: readonly string[]) {
    const requested = new Set(compactList(fileNames));

    this.styles.forEach((entry) => {
      if (requested.size > 0 && !requested.has(entry.fileName)) return;

      entry.status = "idle";
      entry.error = undefined;
      this.ensureStyleLoaded(entry);
    });
  }

  /** Replaces CSS text for already registered file entries without calling the loader. */
  replace(styles: readonly StyleAtomCssReplacementT[]) {
    const replacements = new Map(
      styles
        .filter(
          (style): style is StyleAtomCssReplacementT =>
            typeof style?.fileName === "string" &&
            style.fileName.length > 0 &&
            typeof style.css === "string",
        )
        .map((style) => [style.fileName, style.css]),
    );

    if (replacements.size === 0) return;

    this.styles.forEach((entry) => {
      if (entry.inline) return;
      const css = replacements.get(entry.fileName);
      if (css === undefined) return;

      const element = this.ensureStyleElement(entry);
      const cssText = createCssText(entry, css);

      if (element && element.textContent !== cssText) {
        element.textContent = cssText;
      }

      entry.revision += 1;
      entry.status = "loaded";
      entry.error = undefined;
      this.refreshAtomsForStyle(entry);
    });
  }

  /** Removes all atoms and all style tags owned by this store. */
  dispose() {
    Array.from(this.atoms.keys()).forEach((id) => this.unregisterAtom(id));
    this.styles.forEach((entry) => entry.element?.remove());
    this.layerOrderElement?.remove();
    this.layerOrderElement = undefined;
    this.styles.clear();
  }

  private createController(id: string): StyleAtomControllerT {
    return {
      id,
      update: (options) => this.updateAtom(id, options),
      subscribe: (listener) => this.subscribeAtom(id, listener),
      getSnapshot: () => this.getSnapshot(id),
      reload: () => this.reload(this.atoms.get(id)?.options.fileNames),
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

  private getDocument() {
    if (this.options.document) return this.options.document;
    if (this.options.target?.ownerDocument)
      return this.options.target.ownerDocument;

    return typeof document === "undefined" ? undefined : document;
  }

  private getTarget() {
    const doc = this.getDocument();

    return this.options.target ?? doc?.head;
  }

  private getLayerOrderCss() {
    const layers = compactList(this.options.layers);

    return layers.length ? `@layer ${layers.join(", ")};` : "";
  }

  private ensureLayerOrder() {
    const cssText = this.getLayerOrderCss();

    if (!cssText) {
      this.layerOrderElement?.remove();
      this.layerOrderElement = undefined;
      return;
    }

    const doc = this.getDocument();
    const target = this.getTarget();

    if (!doc || !target) return;

    if (!this.layerOrderElement) {
      this.layerOrderElement = doc.createElement("style");
      this.layerOrderElement.setAttribute("styled-atom-layers", "true");
    }

    if (this.options.nonce) {
      this.layerOrderElement.setAttribute("nonce", this.options.nonce);
    } else {
      this.layerOrderElement.removeAttribute("nonce");
    }

    if (this.layerOrderElement.textContent !== cssText) {
      this.layerOrderElement.textContent = cssText;
    }

    if (this.layerOrderElement.parentNode !== target) {
      target.insertBefore(this.layerOrderElement, target.firstChild);
    } else if (target.firstChild !== this.layerOrderElement) {
      target.insertBefore(this.layerOrderElement, target.firstChild);
    }
  }

  private ensureStyleElement(entry: StyleEntryT) {
    if (entry.element) return entry.element;

    const doc = this.getDocument();
    const target = this.getTarget();

    if (!doc || !target) return undefined;

    this.ensureLayerOrder();

    const element = doc.createElement("style");
    element.setAttribute("styled-atom-file", entry.fileName);

    if (entry.options.layer) {
      element.setAttribute("styled-atom-layer", entry.options.layer);
    }

    if (this.options.nonce) {
      element.setAttribute("nonce", this.options.nonce);
    }

    target.appendChild(element);
    entry.element = element;

    return element;
  }

  private ensureStyleLoaded(entry: StyleEntryT) {
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

    if (entry.inline) {
      const cssText = createCssText(entry, "");

      if (element.textContent !== cssText) {
        element.textContent = cssText;
      }

      entry.status = "loaded";
      entry.error = undefined;
      this.refreshAtomsForStyle(entry);
      return;
    }

    const loader = this.options.path;

    if (!loader) {
      this.refreshAtomsForStyle(entry);
      return;
    }

    const revision = entry.revision + 1;
    entry.revision = revision;
    entry.status = "loading";
    entry.error = undefined;
    this.refreshAtomsForStyle(entry);

    Promise.resolve(loader(entry.fileName))
      .then((result) => {
        if (entry.revision !== revision) return;

        const css = normalizeLoaderResult(result);
        const cssText = createCssText(entry, css);

        if (element.textContent !== cssText) {
          element.textContent = cssText;
        }

        entry.status = "loaded";
        entry.error = undefined;
        this.refreshAtomsForStyle(entry);
      })
      .catch((error: unknown) => {
        if (entry.revision !== revision) return;

        element.textContent = `/* styled-atom failed to load "${entry.fileName}" */`;
        entry.status = "error";
        entry.error = error;
        this.refreshAtomsForStyle(entry);

        console.error(
          `Loading failed for "${entry.fileName}" style`,
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
      .filter((entry) => entry.status === "error")
      .map((entry) => ({ fileName: entry.fileName, error: entry.error }));
    const loading = entries.some(
      (entry) => entry.status === "idle" || entry.status === "loading",
    );
    const loaded =
      entries.length === 0 ||
      entries.every(
        (entry) => entry.status === "loaded" || entry.status === "error",
      );
    const snapshot: StyleAtomSnapshotT = {
      id: atom.id,
      loaded,
      loading,
      fileNames: atom.options.fileNames,
      errors,
    };
    const snapshotKey = stableKey({
      loaded,
      loading,
      fileNames: atom.options.fileNames,
      errors: errors.map((error) => [error.fileName, formatError(error.error)]),
    });

    atom.snapshot = snapshot;

    if (snapshotKey !== atom.snapshotKey) {
      atom.snapshotKey = snapshotKey;
      atom.listeners.forEach((listener) => listener());
    }
  }
}

export const createStyleStore = (options?: StyledAtomStoreOptionsT) =>
  new StyledAtomStore(options);
