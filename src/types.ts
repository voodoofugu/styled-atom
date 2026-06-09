import type React from "react";

/**
 * Value returned by a style loader. CSS bundlers usually return
 * `{ default: string }`, but plain strings and empty results are accepted too.
 */
export type ImportStyleResultT =
  | string
  | { default?: unknown }
  | null
  | undefined
  | void;

/**
 * Dynamic CSS loader used by styled-atom.
 *
 * @example
 * ```ts
 * const path = (name: string) => import(`./css/${name}.css`);
 * ```
 */
export type ImportStyleT = (
  fileName: string
) => ImportStyleResultT | Promise<ImportStyleResultT>;

/** CSS custom property values injected before loaded CSS. */
export type StyleVarsT = Record<
  string,
  string | number | boolean | null | undefined
>;

/**
 * Encapsulation configuration.
 *
 * - `true` keeps the old behavior: CSS is wrapped by the file-name class and
 *   content receives a wrapper element.
 * - `string` adds extra wrapper classes while keeping the old CSS wrapping.
 * - object form can wrap CSS without wrapping content.
 */
export type StyleEncapT =
  | boolean
  | string
  | {
      /** CSS selector used as a wrapper around loaded CSS. */
      selector?: string;
      /** Alias for `selector` when a string is passed. */
      css?: boolean | string;
      /** Whether React content should receive an extra wrapper element. */
      content?: boolean;
      /** Alias for `content`, useful for declarative configs. */
      wrap?: boolean;
      /** Extra class names for the content wrapper. */
      className?: string | string[];
      /** Add the `atom-shell` attribute to the content wrapper. */
      atomShell?: boolean;
      /** Selector used for CSS variables. Defaults to `selector` or `:root`. */
      varsSelector?: string;
    };

/** Shared style options used by React and framework-agnostic APIs. */
export type StyleAtomOptionsT = {
  /** CSS atom names passed to the configured loader. */
  fileNames?: readonly string[];
  /** Optional CSS encapsulation settings. */
  encap?: StyleEncapT;
  /** Optional CSS cascade layer name. */
  layer?: string;
  /** CSS variables injected into the same style tag. */
  vars?: StyleVarsT;
  /** Alias for `vars`. */
  cssVars?: StyleVarsT;
};

/** Snapshot reported for a single registered atom. */
export type StyleAtomSnapshotT = {
  id: string;
  loaded: boolean;
  loading: boolean;
  fileNames: string[];
  errors: StyleLoadErrorT[];
};

/** A single style loading error. */
export type StyleLoadErrorT = {
  fileName: string;
  error: unknown;
};

/** Options used to create or configure a store. */
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

/** Controller returned when an atom is registered in a store. */
export type StyleAtomControllerT = {
  id: string;
  update: (options: StyleAtomOptionsT) => void;
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => StyleAtomSnapshotT;
  dispose: () => void;
};

export type StyledAtomT = StyleAtomOptionsT & {
  fallback?: React.ReactNode;
  onLoad?: () => void;
  children?: React.ReactNode;
};
