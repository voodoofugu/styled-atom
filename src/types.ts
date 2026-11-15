import type * as CSS from "csstype";

export type StyleStatus = "loading" | "ready" | "failed";

export type StylePlacement = "head" | "inline";

export type StyleTarget = Document | ShadowRoot | HTMLElement;

export type StyleTargetValue =
  | StyleTarget
  | null
  | undefined
  | (() => StyleTarget | null | undefined);

export type ImportStyleResult =
  | string
  | { default?: unknown }
  | null
  | undefined
  | void;

export type ImportStyle<TFile extends string = string> = (
  fileName: TFile,
) => ImportStyleResult | Promise<ImportStyleResult>;

export type StyleAtomFiles<TFile extends string = string> =
  | TFile
  | readonly TFile[];

export type StyleAtomCssScalar = string | number;

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

export type StyledAtomStyles = CssPropertiesWithFallbacks & {
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

export type StyleErrorCode = "load" | "conflict" | "target";

export type StyleLoadError = {
  code: StyleErrorCode;
  source: string;
  error: unknown;
};

export type MountedStyle = {
  key: string;
  kind: "file" | "inline";
  name: string;
  css: string;
  precedence: number;
};

export type StyleAtomSnapshot = {
  id: string;
  status: StyleStatus;
  files: readonly string[];
  errors: readonly StyleLoadError[];
  styles: readonly MountedStyle[];
};

export type StyleRuntimeEntryInspection = {
  key: string;
  name: string;
  kind: "file" | "inline";
  status: StyleStatus;
  placement: StylePlacement;
  target: "document" | "shadow-root" | "element" | "inline" | "server";
  precedence: number;
  owners: number;
  cssLength: number;
  error?: StyleLoadError;
};

export type StyleRuntimeInspection = {
  namespace: string;
  atoms: number;
  entries: readonly StyleRuntimeEntryInspection[];
};

export type StyleAtomOptions<TFile extends string = string> = {
  files?: StyleAtomFiles<TFile>;
  inlineStyle?: StyleAtomInlineStyle;
  placement?: StylePlacement;
  target?: StyleTargetValue;
  nonce?: string;
  precedence?: number;
};

export type StyleAtomCssReplacement<TFile extends string = string> = {
  file: TFile;
  css: string;
};

export type StyleAtomController<TFile extends string = string> = {
  readonly id: string;
  update: (options: StyleAtomOptions<TFile>) => void;
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => StyleAtomSnapshot;
  reload: () => void;
  retry: () => void;
  replace: (styles: readonly StyleAtomCssReplacement<TFile>[]) => void;
  dispose: () => void;
};

export type InitialStyles<TFile extends string = string> = Partial<
  Record<TFile, string>
>;

export type StyleRuntimeOptions<TFile extends string = string> = {
  loader?: ImportStyle<TFile>;
  target?: StyleTargetValue;
  placement?: StylePlacement;
  nonce?: string;
  order?: readonly TFile[];
  initialStyles?: InitialStyles<TFile>;
  namespace?: string;
  onError?: (error: StyleLoadError) => void;
};

export type CollectedStyle = MountedStyle & {
  namespace: string;
  nonce?: string;
};

export type StyleCollector = {
  collect: (style: CollectedStyle) => void;
  getStyles: () => readonly CollectedStyle[];
  getStyleTags: () => string;
  clear: () => void;
};
