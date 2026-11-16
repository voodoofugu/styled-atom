import type * as CSS from "csstype";

/**---
 * ## ![logo](https://github.com/voodoofugu/styled-atom/raw/main/src/assets/styled-atom-logo.png)
 * ### ***StyleStatus***:
 * the lifecycle state of one registered style atom.
 */
export type StyleStatus = "loading" | "ready" | "failed";

/**---
 * ## ![logo](https://github.com/voodoofugu/styled-atom/raw/main/src/assets/styled-atom-logo.png)
 * ### ***StylePlacement***:
 * where the runtime renders a style element.
 */
export type StylePlacement = "head" | "inline";

/**---
 * ## ![logo](https://github.com/voodoofugu/styled-atom/raw/main/src/assets/styled-atom-logo.png)
 * ### ***StyleTarget***:
 * a DOM destination that can own injected style elements.
 */
export type StyleTarget = Document | ShadowRoot | HTMLElement;

/**---
 * ## ![logo](https://github.com/voodoofugu/styled-atom/raw/main/src/assets/styled-atom-logo.png)
 * ### ***StyleTargetValue***:
 * a style target or a callback that resolves it when the atom registers.
 */
export type StyleTargetValue =
  | StyleTarget
  | null
  | undefined
  | (() => StyleTarget | null | undefined);

/**---
 * ## ![logo](https://github.com/voodoofugu/styled-atom/raw/main/src/assets/styled-atom-logo.png)
 * ### ***ImportStyleResult***:
 * values accepted from a CSS file loader.
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
 * loads CSS text for a named file atom.
 */
export type ImportStyle<TFile extends string = string> = (
  fileName: TFile,
) => ImportStyleResult | Promise<ImportStyleResult>;

/**---
 * ## ![logo](https://github.com/voodoofugu/styled-atom/raw/main/src/assets/styled-atom-logo.png)
 * ### ***StyleAtomFiles***:
 * one file atom name or a request for several file atoms.
 */
export type StyleAtomFiles<TFile extends string = string> =
  | TFile
  | readonly TFile[];

/**---
 * ## ![logo](https://github.com/voodoofugu/styled-atom/raw/main/src/assets/styled-atom-logo.png)
 * ### ***StyleAtomCssScalar***:
 * a declaration value before formatting.
 */
export type StyleAtomCssScalar = string | number;

/**---
 * ## ![logo](https://github.com/voodoofugu/styled-atom/raw/main/src/assets/styled-atom-logo.png)
 * ### ***StyleAtomCssValue***:
 * a declaration value, including repeated fallback declarations.
 */
export type StyleAtomCssValue =
  | StyleAtomCssScalar
  | readonly StyleAtomCssScalar[]
  | null
  | undefined;

type CssPropertiesWithFallbacks = {
  [TProperty in keyof CSS.Properties<StyleAtomCssScalar>]?:
    | CSS.Properties<StyleAtomCssScalar>[TProperty]
    | readonly Exclude<
        CSS.Properties<StyleAtomCssScalar>[TProperty],
        undefined
      >[];
};

/**---
 * ## ![logo](https://github.com/voodoofugu/styled-atom/raw/main/src/assets/styled-atom-logo.png)
 * ### ***StyledAtomStyles***:
 * a typed stylesheet tree for the React `style` prop and the standalone
 * compiler. Keys can be declarations, nested selectors or at-rules.
 */
export type StyledAtomStyles = CssPropertiesWithFallbacks & {
  [selectorOrProperty: string]:
    | StyleAtomCssValue
    | StyledAtomStyles
    | undefined;
};

/**---
 * ## ![logo](https://github.com/voodoofugu/styled-atom/raw/main/src/assets/styled-atom-logo.png)
 * ### ***StyleAtomStyles***:
 * the framework-agnostic name for `StyledAtomStyles`.
 */
export type StyleAtomStyles = StyledAtomStyles;

/**---
 * ## ![logo](https://github.com/voodoofugu/styled-atom/raw/main/src/assets/styled-atom-logo.png)
 * ### ***StyleAtomInlineStyle***:
 * precompiled inline CSS registered directly with the core runtime.
 */
export type StyleAtomInlineStyle = {
  /** Stable public identity of the inline atom. */
  name: string;
  /** CSS text mounted by the runtime. */
  css: string;
};

/**---
 * ## ![logo](https://github.com/voodoofugu/styled-atom/raw/main/src/assets/styled-atom-logo.png)
 * ### ***StyleErrorCode***:
 * the failure categories reported by the runtime.
 */
export type StyleErrorCode = "load" | "conflict" | "target";

/**---
 * ## ![logo](https://github.com/voodoofugu/styled-atom/raw/main/src/assets/styled-atom-logo.png)
 * ### ***StyleLoadError***:
 * a loader, ownership or mount-target failure.
 */
export type StyleLoadError = {
  /** Machine-readable failure category. */
  code: StyleErrorCode;
  /** File name, inline atom name or `target`. */
  source: string;
  /** The original thrown value or a runtime error. */
  error: unknown;
};

/**---
 * ## ![logo](https://github.com/voodoofugu/styled-atom/raw/main/src/assets/styled-atom-logo.png)
 * ### ***MountedStyle***:
 * CSS ready to render or serialize.
 */
export type MountedStyle = {
  /** Stable key within a namespace and precedence level. */
  key: string;
  /** How the CSS entered the runtime. */
  kind: "file" | "inline";
  /** Public file or inline atom name. */
  name: string;
  /** Final CSS text, including an optional generated `sourceURL`. */
  css: string;
  /** Numeric cascade position used to order style elements. */
  precedence: number;
};

/**---
 * ## ![logo](https://github.com/voodoofugu/styled-atom/raw/main/src/assets/styled-atom-logo.png)
 * ### ***StyleAtomSnapshot***:
 * immutable public state of one registered atom.
 */
export type StyleAtomSnapshot = {
  /** Runtime-local atom identifier. */
  id: string;
  /** Current lifecycle state. */
  status: StyleStatus;
  /** Normalized file names requested by the atom. */
  files: readonly string[];
  /** Current failures. Empty while loading or ready. */
  errors: readonly StyleLoadError[];
  /** CSS that is ready to mount, collect or render inline. */
  styles: readonly MountedStyle[];
};

/**---
 * ## ![logo](https://github.com/voodoofugu/styled-atom/raw/main/src/assets/styled-atom-logo.png)
 * ### ***StyleRuntimeEntryInspection***:
 * diagnostic information for one runtime CSS entry.
 */
export type StyleRuntimeEntryInspection = {
  /** Stable public key used on the style element. */
  key: string;
  /** File or inline atom name. */
  name: string;
  /** How the CSS entered the runtime. */
  kind: "file" | "inline";
  /** Current entry state. */
  status: StyleStatus;
  /** Resolved style element placement. */
  placement: StylePlacement;
  /** Resolved destination category. */
  target: "document" | "shadow-root" | "element" | "inline" | "server";
  /** Numeric cascade position. */
  precedence: number;
  /** Number of atoms in this runtime that currently own the entry. */
  localOwners: number;
  /** Length of the loaded CSS text before generated annotations. */
  cssLength: number;
  /** Current failure, when the entry is failed. */
  error?: StyleLoadError;
};

/**---
 * ## ![logo](https://github.com/voodoofugu/styled-atom/raw/main/src/assets/styled-atom-logo.png)
 * ### ***StyleRuntimeInspection***:
 * a read-only diagnostic report for one runtime.
 */
export type StyleRuntimeInspection = {
  /** Runtime namespace used to coordinate shared ownership. */
  namespace: string;
  /** Number of registered atoms in this runtime. */
  atoms: number;
  /** Active file and inline CSS entries. */
  entries: readonly StyleRuntimeEntryInspection[];
};

/**---
 * ## ![logo](https://github.com/voodoofugu/styled-atom/raw/main/src/assets/styled-atom-logo.png)
 * ### ***StyleAtomOptions***:
 * options used to register or update one core runtime atom.
 */
export type StyleAtomOptions<TFile extends string = string> = {
  /** Named CSS file atoms loaded through the runtime loader. */
  files?: StyleAtomFiles<TFile>;
  /** Precompiled inline CSS. React compiles its `style` prop into this form. */
  inlineStyle?: StyleAtomInlineStyle;
  /** Overrides the runtime placement for this atom. */
  placement?: StylePlacement;
  /** Overrides the runtime target for this atom. */
  target?: StyleTargetValue;
  /** Overrides the runtime CSP nonce for this atom. */
  nonce?: string;
  /** Overrides the configured cascade order for this atom. */
  precedence?: number;
};

/**---
 * ## ![logo](https://github.com/voodoofugu/styled-atom/raw/main/src/assets/styled-atom-logo.png)
 * ### ***StyleAtomCssReplacement***:
 * a direct CSS replacement for a named file atom.
 */
export type StyleAtomCssReplacement<TFile extends string = string> = {
  /** File atom to replace. */
  file: TFile;
  /** New CSS text. */
  css: string;
};

/**---
 * ## ![logo](https://github.com/voodoofugu/styled-atom/raw/main/src/assets/styled-atom-logo.png)
 * ### ***StyleAtomController***:
 * imperative handle returned when the core runtime registers an atom.
 */
export type StyleAtomController<TFile extends string = string> = {
  /** Runtime-local atom identifier. */
  readonly id: string;
  /** Reconciles the atom with a new set of options. */
  update: (options: StyleAtomOptions<TFile>) => void;
  /** Subscribes to snapshot changes. Returns the unsubscribe function. */
  subscribe: (listener: () => void) => () => void;
  /** Returns the current immutable snapshot. */
  getSnapshot: () => StyleAtomSnapshot;
  /** Reloads file CSS owned by this atom. */
  reload: () => void;
  /** Retries failures owned by this atom. */
  retry: () => void;
  /** Replaces mounted file CSS without calling the loader. */
  replace: (styles: readonly StyleAtomCssReplacement<TFile>[]) => void;
  /** Releases this atom and its ownership references. */
  dispose: () => void;
};

/**---
 * ## ![logo](https://github.com/voodoofugu/styled-atom/raw/main/src/assets/styled-atom-logo.png)
 * ### ***InitialStyles***:
 * synchronous CSS available before a loader runs, including during SSR.
 */
export type InitialStyles<TFile extends string = string> = Partial<
  Record<TFile, string>
>;

/**---
 * ## ![logo](https://github.com/voodoofugu/styled-atom/raw/main/src/assets/styled-atom-logo.png)
 * ### ***StyleRuntimeOptions***:
 * configuration shared by every atom registered with a runtime.
 */
export type StyleRuntimeOptions<TFile extends string = string> = {
  /** Loads CSS text for named file atoms. */
  loader?: ImportStyle<TFile>;
  /** Default DOM destination. Uses the current document when omitted. */
  target?: StyleTargetValue;
  /** Default style element placement. @default "head" */
  placement?: StylePlacement;
  /**
   * Adds readable virtual filenames to generated CSS. Defaults to enabled in
   * development and tests, and disabled in production.
   */
  sourceURL?: boolean;
  /** Default CSP nonce applied to owned style elements. */
  nonce?: string;
  /** Stable cascade order for named file atoms. */
  order?: readonly TFile[];
  /** CSS available synchronously for first render and server collection. */
  initialStyles?: InitialStyles<TFile>;
  /** Stable ownership namespace. Automatic namespaces are unique per runtime. */
  namespace?: string;
  /** Receives loader, target and ownership failures. */
  onError?: (error: StyleLoadError) => void;
};

/**---
 * ## ![logo](https://github.com/voodoofugu/styled-atom/raw/main/src/assets/styled-atom-logo.png)
 * ### ***CollectedStyle***:
 * a mounted style with the data needed for server serialization.
 */
export type CollectedStyle = MountedStyle & {
  /** Runtime ownership namespace. */
  namespace: string;
  /** CSP nonce serialized on the style element. */
  nonce?: string;
};

/**---
 * ## ![logo](https://github.com/voodoofugu/styled-atom/raw/main/src/assets/styled-atom-logo.png)
 * ### ***StyleCollector***:
 * per-request collection of styles emitted during server rendering.
 */
export type StyleCollector = {
  /** Adds or updates one collected style. */
  collect: (style: CollectedStyle) => void;
  /** Returns styles in deterministic cascade order. */
  getStyles: () => readonly CollectedStyle[];
  /** Serializes collected styles into HTML style tags. */
  getStyleTags: () => string;
  /** Removes every collected style. */
  clear: () => void;
};
