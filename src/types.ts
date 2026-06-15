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
 * dynamic CSS loader used by `StyledAtomStore`.
 * @param fileName CSS atom name requested by `StyledAtom`, `registerAtom` or `preload`.
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
 * <StyledAtom fileNames={["screen-main"]} encap />
 * <StyledAtom fileNames={["screen-main"]} encap="customClass" />
 * <StyledAtom fileNames={["screen-main"]} encap={{ className: "customClass" }} />
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

/**---
 * ## ![logo](https://github.com/voodoofugu/styled-atom/raw/main/src/assets/styled-atom-logo.png)
 * ### ***StyleAtomOptionsT***:
 * shared style options used by React and framework-agnostic APIs.
 * @description
 * These options describe one atom: CSS file names, optional wrapper behavior, optional cascade layer and optional inline CSS. The same shape is accepted by `StyledAtom`, `registerAtom`, `preload` and `update`.
 * @example
 * ```ts
 * const options: StyleAtomOptionsT = {
 *   fileNames: ["card", "theme"],
 *   layer: "components",
 *   encap: "customClass",
 * };
 * ```
 */
export type StyleAtomOptionsT = {
  /** CSS atom names passed to the configured loader. */
  fileNames?: readonly string[];
  /** Optional CSS encapsulation settings. */
  encap?: StyleEncapT;
  /** Optional CSS cascade layer name. */
  layer?: string;
  /** Additional CSS rules or variables injected before loaded CSS. */
  css?: string;
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
  /** Normalized file names requested by this atom. */
  fileNames: string[];
  /** Loading errors grouped by file name. */
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
  fileName: string;
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
 * styleAtoms.replace([
 *   { fileName: "screen-main", css: nextCss },
 * ]);
 * ```
 */
export type StyleAtomCssReplacementT = {
  /** CSS atom name to replace. */
  fileName: string;
  /** New CSS text for that atom. */
  css: string;
};

/**---
 * ## ![logo](https://github.com/voodoofugu/styled-atom/raw/main/src/assets/styled-atom-logo.png)
 * ### ***StyledAtomStoreOptionsT***:
 * options used to create or configure a style store.
 * @description
 * Pass the loader and DOM placement once when a store is created, or later through `configure()`. `layers` writes a cascade layer order before generated atom styles so async load timing does not change priority.
 * @example
 * ```ts
 * const options: StyledAtomStoreOptionsT = {
 *   path: (name) => import(`./css/${name}.css`),
 *   layers: ["base", "components", "overrides"],
 * };
 * ```
 */
export type StyledAtomStoreOptionsT = {
  /** Dynamic CSS loader. */
  path?: ImportStyleT;
  /** CSS cascade layer order declared before generated layer styles. */
  layers?: readonly string[];
  /** DOM document used for style tag creation. Defaults to global document. */
  document?: Document;
  /** Element or shadow root where style tags should be mounted. */
  target?: HTMLElement | ShadowRoot;
  /** Optional nonce added to generated style tags. */
  nonce?: string;
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
  /** Reload this atom's file names from the configured loader. */
  reload: () => void;
  /** Replace CSS text for already registered file entries. */
  replace: (styles: readonly StyleAtomCssReplacementT[]) => void;
  /** Release this atom and remove unused style references. */
  dispose: () => void;
};

/**---
 * ## ![logo](https://github.com/voodoofugu/styled-atom/raw/main/src/assets/styled-atom-logo.png)
 * ### ***StyledAtomT***:
 * props accepted by the React `StyledAtom` component.
 * @description
 * Extends `StyleAtomOptionsT` with React rendering props. Children are rendered only after the atom is loaded. When there are no `fileNames` and no `css`, the component simply renders `children` or `fallback`.
 * @example
 * ```tsx
 * <StyledAtom fileNames={["button"]} fallback={<span>Loading...</span>}>
 *   <Button />
 * </StyledAtom>
 * ```
 */
export type StyledAtomT = StyleAtomOptionsT & {
  /** Content rendered while requested styles are loading. */
  fallback?: React.ReactNode;
  /** Called once when this atom changes from loading to loaded. */
  onLoad?: () => void;
  /** React content protected by this style atom. */
  children?: React.ReactNode;
};
