import type React from "react";

/**---
 * ## ![logo](https://github.com/voodoofugu/styled-atom/raw/main/src/assets/styled-atom-logo.png)
 * ### ***ImportStyleResultT***:
 * value returned by a dynamic CSS loader.
 * @description
 * CSS bundlers usually return `{ default: string }`, but `styled-atom` also accepts plain CSS strings and empty results. Empty results still mark the atom as loaded, so a loader can intentionally no-op for optional style files.
 * @example
 * ```ts
 * const css: ImportStyleResultT = await import("./styles/button.css");
 * ```
 */
export type ImportStyleResultT =
  | string
  | { default?: unknown }
  | null
  | undefined
  | void;

/**---
 * ## ![logo](https://github.com/voodoofugu/styled-atom/raw/main/src/assets/styled-atom-logo.png)
 * ### ***ImportStyleT***:
 * dynamic CSS loader used by `createStyledAtomStore`.
 * @param fileName CSS atom name requested by `StyledAtom`.
 * @description
 * The loader receives the atom name without forcing a file extension convention. Host projects usually map it to a bundler import, for example `import("./css/" + fileName + ".css")`.
 * @example
 * ```ts
 * const path: ImportStyleT = (name) => import(`./css/${name}.css`);
 * ```
 */
export type ImportStyleT = (
  fileName: string,
) => ImportStyleResultT | Promise<ImportStyleResultT>;

/**---
 * ## ![logo](https://github.com/voodoofugu/styled-atom/raw/main/src/assets/styled-atom-logo.png)
 * ### ***StyleEncapT***:
 * wrapper configuration for body-like preview scopes.
 * @description
 * `encap` only controls the rendered wrapper element. Loaded CSS is injected as raw CSS. Projects that need body-like scoping should rewrite selectors during their CSS build step and add the same class, id or attribute to this wrapper.
 * @example
 * ```tsx
 * <StyledAtom files="screen-main" encap />
 * <StyledAtom files="screen-main" encap="customClass" />
 * <StyledAtom files="screen-main" encap={{ className: "customClass" }} />
 * ```
 */
export type StyleEncapT =
  | boolean
  | string
  | {
      /** Whether React content should receive an extra wrapper element. */
      content?: boolean;
      /** Alias for `content`, useful for declarative configs. */
      wrap?: boolean;
      /** Wrapper element class names. */
      className?: string | string[];
      /** Wrapper element id. */
      id?: string;
      /** Wrapper element attributes. */
      attribute?: Record<string, string>;
    };

export type StyleAtomFilesT = string | readonly string[];

export type StyleAtomCssValueT = string | number | null | undefined;

export type StyledAtomStylesT = React.CSSProperties & {
  [selectorOrProperty: string]:
    | StyleAtomCssValueT
    | StyledAtomStylesT
    | undefined;
};

export type StyleAtomStylesT = StyledAtomStylesT;

export type StyleAtomInlineStyleT = {
  name: string;
  css: string;
};

/**---
 * ## ![logo](https://github.com/voodoofugu/styled-atom/raw/main/src/assets/styled-atom-logo.png)
 * ### ***StyleAtomOptionsT***:
 * shared style options used by React APIs.
 * @description
 * These options describe one atom: CSS files, optional inline CSS and optional wrapper behavior.
 * @example
 * ```ts
 * const options: StyleAtomOptionsT = {
 *   files: ["card", "theme"],
 *   encap: "customClass",
 * };
 * ```
 */
export type StyleAtomOptionsT = {
  /** CSS atom names passed to the configured loader. */
  files?: StyleAtomFilesT;
  /** Already compiled inline CSS owned by this atom. */
  inlineStyle?: StyleAtomInlineStyleT;
  /** Optional CSS encapsulation settings. */
  encap?: StyleEncapT;
};

/**---
 * ## ![logo](https://github.com/voodoofugu/styled-atom/raw/main/src/assets/styled-atom-logo.png)
 * ### ***StyleAtomSnapshotT***:
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
export type StyleAtomSnapshotT = {
  /** Stable atom id inside the store. */
  id: string;
  /** `true` when every requested style has either loaded or failed. */
  loaded: boolean;
  /** `true` while at least one requested style is still idle/loading. */
  loading: boolean;
  /** Normalized files requested by this atom. */
  files: string[];
  /** Loading errors grouped by file. */
  errors: StyleLoadErrorT[];
};

/**---
 * ## ![logo](https://github.com/voodoofugu/styled-atom/raw/main/src/assets/styled-atom-logo.png)
 * ### ***StyleLoadErrorT***:
 * one failed style loader result.
 * @description
 * The store keeps the original thrown value so host tooling can decide whether to log, surface or ignore the failure.
 */
export type StyleLoadErrorT = {
  /** CSS atom name that failed to load. */
  file: string;
  /** Original error thrown by the configured loader. */
  error: unknown;
};

/**---
 * ## ![logo](https://github.com/voodoofugu/styled-atom/raw/main/src/assets/styled-atom-logo.png)
 * ### ***StyleAtomCssReplacementT***:
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
export type StyleAtomCssReplacementT = {
  /** CSS atom name to replace. */
  file: string;
  /** New CSS text for that atom. */
  css: string;
};

/**---
 * ## ![logo](https://github.com/voodoofugu/styled-atom/raw/main/src/assets/styled-atom-logo.png)
 * ### ***StyleAtomControllerT***:
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
export type StyleAtomControllerT = {
  /** Stable atom id inside the store. */
  id: string;
  /** Update the atom options without creating a new controller. */
  update: (options: StyleAtomOptionsT) => void;
  /** Subscribe to snapshot changes for this atom. */
  subscribe: (listener: () => void) => () => void;
  /** Read the latest loading snapshot for this atom. */
  getSnapshot: () => StyleAtomSnapshotT;
  /** Reload this atom's files from the configured loader. */
  reload: () => void;
  /** Replace CSS text for already registered file entries. */
  replace: (styles: readonly StyleAtomCssReplacementT[]) => void;
  /** Release this atom and remove unused style references. */
  dispose: () => void;
};

export type StyledAtomBaseT = {
  /** Optional CSS encapsulation settings. */
  encap?: StyleEncapT;
  /** Content rendered while requested styles are loading. */
  fallback?: React.ReactNode;
  /** Called once when this atom changes from loading to loaded. */
  onLoad?: () => void;
  /** React content protected by this style atom. */
  children?: React.ReactNode;
};

export type StyledAtomImportT = StyledAtomBaseT & {
  /** CSS atom names passed to the configured loader. */
  files?: StyleAtomFilesT;
  name?: never;
  styles?: never;
};

export type StyledAtomInlineT = StyledAtomBaseT & {
  /** Inline style atom name used for the DOM style tag and dev sourceURL. */
  name: string;
  /** React-like CSS object compiled into an owned style tag. */
  styles: StyledAtomStylesT;
  files?: never;
};

/**---
 * ## ![logo](https://github.com/voodoofugu/styled-atom/raw/main/src/assets/styled-atom-logo.png)
 * ### ***StyledAtomT***:
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
export type StyledAtomT = StyledAtomImportT | StyledAtomInlineT;

/**---
 * ## ![logo](https://github.com/voodoofugu/styled-atom/raw/main/src/assets/styled-atom-logo.png)
 * ### ***ReactStyledAtomStoreT***:
 * React-facing style atom runtime returned by `createStyledAtomStore`.
 * @description
 * Contains the bound `StyledAtom` component and a small set of runtime controls for configuring the CSS loader and refreshing mounted style tags during development.
 */
export type ReactStyledAtomStoreT = {
  /** React component bound to this runtime. */
  StyledAtom: React.FC<StyledAtomImportT>;
  /** Set or replace the CSS loader. */
  configure: (path?: ImportStyleT) => void;
  /** Reload all or selected mounted CSS atoms through the configured loader. */
  reload: (files?: StyleAtomFilesT) => void;
  /** Replace CSS text for already mounted CSS atoms. */
  replace: (styles: readonly StyleAtomCssReplacementT[]) => void;
  /** Remove all mounted style tags owned by this runtime. */
  dispose: () => void;
};
