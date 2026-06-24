import type React from "react";

/**---
 * ## ![logo](https://github.com/voodoofugu/styled-atom/raw/main/src/assets/styled-atom-logo.png)
 * ### ***ImportStyleResult***:
 * value returned by a dynamic CSS loader.
 * @description
 * CSS bundlers usually return `{ default: string }`, but `styled-atom` also accepts plain CSS strings and empty results. Empty results still mark the atom as loaded, so a loader can intentionally no-op for optional style files.
 * @example
 * ```ts
 * const css: ImportStyleResult = await import("./styles/button.css");
 * ```
 */
export type ImportStyleResult =
  | string
  | { default?: unknown }
  | null
  | undefined
  | void;

/**---
 * ## ![logo](https://github.com/voodoofugu/styled-atom/raw/main/src/assets/styled-atom-logo.png)
 * ### ***ImportStyle***:
 * dynamic CSS loader used by `createStyledAtomStore`.
 * @param fileName CSS atom name requested by `StyledAtom`.
 * @description
 * The loader receives the atom name without forcing a file extension convention. Host projects usually map it to a bundler import, for example `import("./css/" + fileName + ".css")`.
 * @example
 * ```ts
 * const path: ImportStyle = (name) => import(`./css/${name}.css`);
 * ```
 */
export type ImportStyle<TFile extends string = string> = (
  fileName: TFile,
) => ImportStyleResult | Promise<ImportStyleResult>;

/**---
 * ## ![logo](https://github.com/voodoofugu/styled-atom/raw/main/src/assets/styled-atom-logo.png)
 * ### ***StyleEncap***:
 * wrapper configuration for optional style scopes.
 * @description
 * Store-bound atoms use `encap` only for the rendered wrapper element. Loaded CSS is injected as raw CSS, so imported files should target the same class, id or attribute themselves. Inline atoms also use this wrapper as the generated selector scope.
 * @example
 * ```tsx
 * <StyledAtom files="screen-main" encap />
 * <StyledAtom files="screen-main" encap="customClass" />
 * <StyledAtom files="screen-main" encap={{ className: "customClass" }} />
 * ```
 */
export type StyleEncap =
  | boolean
  | string
  | {
      /** Wrapper element class names. */
      className?: string | string[];
      /** Wrapper element id. */
      id?: string;
      /** Wrapper element attributes. */
      attribute?: Record<string, string>;
    };

/**---
 * ## ![logo](https://github.com/voodoofugu/styled-atom/raw/main/src/assets/styled-atom-logo.png)
 * ### ***StyleAtomFiles***:
 * one or many CSS atom names.
 * @description
 * Accepts a single CSS atom name or a readonly list of atom names.
 * @example
 * ```ts
 * const files: StyleAtomFiles = [
 *   "stabilize",
 *   "screen-main",
 * ];
 * ```
 */
export type StyleAtomFiles<TFile extends string = string> =
  | TFile
  | readonly TFile[];

export type StyleAtomCssValue = string | number | null | undefined;

/**---
 * ## ![logo](https://github.com/voodoofugu/styled-atom/raw/main/src/assets/styled-atom-logo.png)
 * ### ***StyledAtomStyles***:
 * React-like object styles for inline atoms.
 * @description
 * Nested selectors, at-rules and declarations are compiled into an owned style tag.
 * @example
 * ```ts
 * const styles: StyledAtomStyles = {
 *   display: "grid",
 *
 *   ".title": {
 *     color: "#2563eb",
 *   },
 * };
 * ```
 */
export type StyledAtomStyles = React.CSSProperties & {
  [selectorOrProperty: string]:
    | StyleAtomCssValue
    | StyledAtomStyles
    | undefined;
};

export type StyleAtomStyles = StyledAtomStyles;

export type StyleAtomInlineStyle = {
  name: string;
  css: string;
};

/**---
 * ## ![logo](https://github.com/voodoofugu/styled-atom/raw/main/src/assets/styled-atom-logo.png)
 * ### ***StyleAtomOptions***:
 * shared style options used by React APIs.
 * @description
 * These options describe one atom: CSS files, optional inline CSS and optional wrapper behavior.
 * @example
 * ```ts
 * const options: StyleAtomOptions = {
 *   files: ["card", "theme"],
 *   encap: "customClass",
 * };
 * ```
 */
export type StyleAtomOptions<TFile extends string = string> = {
  /** CSS atom names passed to the configured loader. */
  files?: StyleAtomFiles<TFile>;
  /** Already compiled inline CSS owned by this atom. */
  inlineStyle?: StyleAtomInlineStyle;
  /** Optional CSS encapsulation settings. */
  encap?: StyleEncap;
};

/**---
 * ## ![logo](https://github.com/voodoofugu/styled-atom/raw/main/src/assets/styled-atom-logo.png)
 * ### ***StyleAtomSnapshot***:
 * current loading state for one registered atom.
 * @description
 * Snapshots are emitted only when the atom-visible loading state changes. Use them in custom integrations to render loading UI, inspect failed files or wait until an atom is ready.
 * @example
 * ```ts
 * const snapshot = controller.getSnapshot();
 *
 * if (snapshot.loaded) {
 *   renderPreview();
 * }
 * ```
 */
export type StyleAtomSnapshot = {
  /** Stable atom id inside the store. */
  id: string;
  /** `true` when every requested style has either loaded or failed. */
  loaded: boolean;
  /** `true` while at least one requested style is still idle/loading. */
  loading: boolean;
  /** Normalized files requested by this atom. */
  files: string[];
  /** Loading errors grouped by file. */
  errors: StyleLoadError[];
};

/**---
 * ## ![logo](https://github.com/voodoofugu/styled-atom/raw/main/src/assets/styled-atom-logo.png)
 * ### ***StyleLoadError***:
 * one failed style loader result.
 * @description
 * The store keeps the original thrown value so host tooling can decide whether to log, surface or ignore the failure.
 */
export type StyleLoadError = {
  /** CSS atom name that failed to load. */
  file: string;
  /** Original error thrown by the configured loader. */
  error: unknown;
};

/**---
 * ## ![logo](https://github.com/voodoofugu/styled-atom/raw/main/src/assets/styled-atom-logo.png)
 * ### ***StyleAtomCssReplacement***:
 * CSS text replacement used by dev-time hot style updates.
 * @description
 * `replace()` updates already registered file atoms without calling the loader. This is useful for watch servers that compile CSS and push fresh text into mounted previews.
 * @example
 * ```ts
 * styleAtomsStore.replace([
 *   { file: "screen-main", css: nextCss },
 * ]);
 * ```
 */
export type StyleAtomCssReplacement<TFile extends string = string> = {
  /** CSS atom name to replace. */
  file: TFile;
  /** New CSS text for that atom. */
  css: string;
};

/**---
 * ## ![logo](https://github.com/voodoofugu/styled-atom/raw/main/src/assets/styled-atom-logo.png)
 * ### ***StyleAtomController***:
 * controller returned for one registered style atom.
 * @description
 * Keep the controller while the styles should stay mounted. Calling `dispose()` releases the atom references and removes any style tags that are no longer used by another atom.
 * @example
 * ```ts
 * const controller = store.preload(["reset", "theme"]);
 *
 * controller.subscribe(() => {
 *   console.log(controller.getSnapshot());
 * });
 *
 * controller.dispose();
 * ```
 */
export type StyleAtomController = {
  /** Stable atom id inside the store. */
  id: string;
  /** Update the atom options without creating a new controller. */
  update: (options: StyleAtomOptions) => void;
  /** Subscribe to snapshot changes for this atom. */
  subscribe: (listener: () => void) => () => void;
  /** Read the latest loading snapshot for this atom. */
  getSnapshot: () => StyleAtomSnapshot;
  /** Reload this atom's files from the configured loader. */
  reload: () => void;
  /** Replace CSS text for already registered file entries. */
  replace: (styles: readonly StyleAtomCssReplacement[]) => void;
  /** Release this atom and remove unused style references. */
  dispose: () => void;
};

export type StyledAtomBase = {
  /** Optional wrapper and style scope settings. */
  encap?: StyleEncap;
  /** Content rendered while requested styles are loading. */
  fallback?: React.ReactNode;
  /** Called once when this atom changes from loading to loaded. */
  onLoad?: () => void;
  /** React content protected by this style atom. */
  children?: React.ReactNode;
};

/**---
 * ## ![logo](https://github.com/voodoofugu/styled-atom/raw/main/src/assets/styled-atom-logo.png)
 * ### ***StyledAtomImport***:
 * props accepted by store-bound StyledAtom components.
 * @description
 * Loads CSS atoms through the loader configured by `createStyledAtomStore`.
 * @example
 * ```tsx
 * <StyledAtomImport files="screen-main">
 *   <Preview />
 * </StyledAtomImport>
 * ```
 */
export type StyledAtomImport<TFile extends string = string> = StyledAtomBase & {
  /** CSS atom names passed to the configured loader. */
  files?: StyleAtomFiles<TFile>;
  name?: never;
  styles?: never;
};

/**---
 * ## ![logo](https://github.com/voodoofugu/styled-atom/raw/main/src/assets/styled-atom-logo.png)
 * ### ***StyledAtomImportComponent***:
 * React component returned by `createStyledAtomStore`.
 * @description
 * Bound to a specific style atom runtime and loader configuration.
 * @example
 * ```ts
 * const StyledAtomImport =
 *   styleAtomsStore.StyledAtom;
 * ```
 */
export type StyledAtomImportComponent<TFile extends string = string> = React.FC<
  StyledAtomImport<TFile>
>;

/**---
 * ## ![logo](https://github.com/voodoofugu/styled-atom/raw/main/src/assets/styled-atom-logo.png)
 * ### ***StyledAtomInline***:
 * React-like object styles used by inline atoms.
 * @description
 * Compiles a React-like style object into an owned style tag.
 * @example
 * ```ts
 * const styles: StyledAtomInline = {
 *   display: "grid",
 *
 *   ".title": {
 *     color: "#2563eb",
 *   },
 * };
 * ```
 */
export type StyledAtomInline = StyledAtomBase & {
  /** Inline style atom name used for the DOM style tag, dev sourceURL and default root selector. */
  name: string;
  /** React-like CSS object compiled into an owned style tag. */
  styles: StyledAtomStyles;
  files?: never;
};

/**---
 * ## ![logo](https://github.com/voodoofugu/styled-atom/raw/main/src/assets/styled-atom-logo.png)
 * ### ***StyledAtom***:
 * props accepted by the React `StyledAtom` component.
 * @description
 * Props accepted by a React `StyledAtom` component. Store-bound atoms load CSS files through `files`; the package-level atom accepts inline `name` and `styles`.
 * @example
 * ```tsx
 * <StyledAtom files="button" fallback={<span>Loading...</span>}>
 *   <Button />
 * </StyledAtom>
 * ```
 */
export type StyledAtomProps = StyledAtomImport | StyledAtomInline;

/**---
 * ## ![logo](https://github.com/voodoofugu/styled-atom/raw/main/src/assets/styled-atom-logo.png)
 * ### ***StyledAtomRuntime***:
 * React-facing style atom runtime returned by `createStyledAtomStore`.
 * @description
 * Contains the bound `StyledAtom` component and a small set of runtime controls for configuring the CSS loader and refreshing mounted style tags during development.
 */
export type StyledAtomRuntime<TFile extends string = string> = {
  /** React component bound to this runtime. */
  StyledAtom: StyledAtomImportComponent<TFile>;
  /** Set or replace the CSS loader. */
  configure: (path?: ImportStyle<TFile>) => void;
  /** Reload all or selected mounted CSS atoms through the configured loader. */
  reload: (files?: StyleAtomFiles<TFile>) => void;
  /** Replace CSS text for already mounted CSS atoms. */
  replace: (styles: readonly StyleAtomCssReplacement<TFile>[]) => void;
  /** Remove all mounted style tags owned by this runtime. */
  dispose: () => void;
};
