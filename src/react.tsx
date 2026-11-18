import React from "react";

import { StyleRuntime } from "./core";
import { isDevelopmentEnvironment } from "./environment";
import {
  compileStyleAtomStyles,
  createStyleAtomSignature,
} from "./styles";
import type {
  StyleAtomController,
  StyleAtomCssReplacement,
  StyleAtomFiles,
  StyleAtomOptions,
  StyleAtomSnapshot,
  StyleCollector,
  StyledAtomStyles,
  StyleRuntimeOptions,
  StyleTargetValue,
} from "./types";

/**---
 * ## ![logo](https://github.com/voodoofugu/styled-atom/raw/main/src/assets/styled-atom-logo.png)
 * ### ***StyleScopeOptions***:
 * DOM wrapper configuration used by the object form of `scope`.
 */
export type StyleScopeOptions = Omit<
  React.HTMLAttributes<HTMLElement>,
  "className"
> &
  Record<string, unknown> & {
    /** Wrapper element or component. @default "div" */
    element?: React.ElementType;
    /** Wrapper class and selector root. Atom names are used when omitted. */
    className?: string;
  };

/**---
 * ## ![logo](https://github.com/voodoofugu/styled-atom/raw/main/src/assets/styled-atom-logo.png)
 * ### ***StyleScope***:
 * optional selector boundary and DOM wrapper for a React style atom. `true`
 * uses the file and inline atom names; a string supplies the wrapper class.
 */
export type StyleScope =
  | boolean
  | string
  | StyleScopeOptions;

/**---
 * ## ![logo](https://github.com/voodoofugu/styled-atom/raw/main/src/assets/styled-atom-logo.png)
 * ### ***StyledAtomRenderState***:
 * atom snapshot exposed to React children and callbacks, with retry support.
 */
export type StyledAtomRenderState = StyleAtomSnapshot & {
  /** Retries the current atom after a loader, target or ownership failure. */
  retry: () => void;
};

/**---
 * ## ![logo](https://github.com/voodoofugu/styled-atom/raw/main/src/assets/styled-atom-logo.png)
 * ### ***StyledAtomChildren***:
 * static children or a render function that receives the current atom state.
 */
export type StyledAtomChildren =
  | React.ReactNode
  | ((state: StyledAtomRenderState) => React.ReactNode);

/**---
 * ## ![logo](https://github.com/voodoofugu/styled-atom/raw/main/src/assets/styled-atom-logo.png)
 * ### ***StyledAtomFallback***:
 * static fallback content or a function that receives the current atom state.
 */
export type StyledAtomFallback =
  | React.ReactNode
  | ((state: StyledAtomRenderState) => React.ReactNode);

type StyledAtomSharedProps = {
  /** Creates a selector wrapper for the atom. No wrapper is rendered by default. */
  scope?: StyleScope;
  /** Renders the style element beside the content instead of in the target head. @default false */
  inlinePlacement?: boolean;
  /** DOM destination for this atom. Overrides the runtime target. */
  target?: StyleTargetValue;
  /** CSP nonce for this atom. Overrides the runtime nonce. */
  nonce?: string;
  /** Cascade position for this atom. Overrides the configured file order. */
  precedence?: number;
  /** Waits until every requested style is ready before rendering children. @default false */
  renderWhenReady?: boolean;
  /** Content shown while CSS loads. Passing it enables blocking rendering. */
  fallback?: StyledAtomFallback;
  /** Content shown after a loader, target or ownership failure. */
  errorFallback?: StyledAtomFallback;
  /** Protected UI content or a render function receiving lifecycle state. */
  children?: StyledAtomChildren;
  /** Called after the atom changes between loading, ready and failed. */
  onStatusChange?: (state: StyledAtomRenderState) => void;
  /** Called when every requested style is ready. */
  onReady?: (state: StyledAtomRenderState) => void;
  /** Called when the atom enters the failed state. */
  onError?: (state: StyledAtomRenderState) => void;
};

type StyledAtomSource<TFile extends string> =
  | {
      /** Named CSS files requested from the store loader. */
      files: StyleAtomFiles<TFile>;
      name?: never;
      style?: never;
    }
  | {
      /** Optional file atoms mounted with the inline style atom. */
      files?: StyleAtomFiles<TFile>;
      /** Stable public identity and default selector class of the inline atom. */
      name: string;
      /** Typed stylesheet tree with declarations, selectors and at-rules. */
      style: StyledAtomStyles;
    };

/**---
 * ## ![logo](https://github.com/voodoofugu/styled-atom/raw/main/src/assets/styled-atom-logo.png)
 * ### ***StyledAtomProps***:
 * props accepted by a store-bound React style atom.
 */
export type StyledAtomProps<TFile extends string = string> =
  StyledAtomSharedProps & StyledAtomSource<TFile>;

/**---
 * ## ![logo](https://github.com/voodoofugu/styled-atom/raw/main/src/assets/styled-atom-logo.png)
 * ### ***InlineStyledAtomProps***:
 * props accepted by the standalone inline `StyledAtom`.
 */
export type InlineStyledAtomProps = StyledAtomSharedProps & {
  files?: never;
  /** Stable public identity and default selector class of the inline atom. */
  name: string;
  /** Typed stylesheet tree with declarations, selectors and at-rules. */
  style: StyledAtomStyles;
};

type StaticAtomSharedProps = Omit<
  StyledAtomSharedProps,
  "inlinePlacement"
> & {
  /** Static stylesheet links mount into their target rather than beside content. */
  inlinePlacement?: never;
};

/**---
 * ## ![logo](https://github.com/voodoofugu/styled-atom/raw/main/src/assets/styled-atom-logo.png)
 * ### ***StaticAtomProps***:
 * props accepted by the standalone external stylesheet atom.
 */
export type StaticAtomProps = StaticAtomSharedProps & {
  files?: never;
  /** Stable public identity used for ownership and diagnostics. */
  name: string;
  /** URL of a ready-made immutable CSS asset. */
  href: string;
};

/**---
 * ## ![logo](https://github.com/voodoofugu/styled-atom/raw/main/src/assets/styled-atom-logo.png)
 * ### ***StoreStaticAtomProps***:
 * props accepted by a store-bound external stylesheet atom.
 */
export type StoreStaticAtomProps<TFile extends string = string> =
  StaticAtomSharedProps & {
    /** Named stylesheet assets requested from the store manifest. */
    files: StyleAtomFiles<TFile>;
    name?: never;
    href?: never;
  };

/**---
 * ## ![logo](https://github.com/voodoofugu/styled-atom/raw/main/src/assets/styled-atom-logo.png)
 * ### ***StyledAtomComponent***:
 * a React component bound to a typed set of file atom names.
 */
export type StyledAtomComponent<TFile extends string = string> = React.FC<
  StyledAtomProps<TFile>
>;

/**---
 * ## ![logo](https://github.com/voodoofugu/styled-atom/raw/main/src/assets/styled-atom-logo.png)
 * ### ***StaticAtomComponent***:
 * a React component bound to a typed set of external stylesheet names.
 */
export type StaticAtomComponent<TFile extends string = string> = React.FC<
  StoreStaticAtomProps<TFile>
>;

/**---
 * ## ![logo](https://github.com/voodoofugu/styled-atom/raw/main/src/assets/styled-atom-logo.png)
 * ### ***StyledAtomStore***:
 * React component and runtime commands returned by `createStyledAtomStore`.
 */
export type StyledAtomStore<TFile extends string = string> = {
  /** React component bound to this store and its loader. */
  StyledAtom: StyledAtomComponent<TFile>;
  /** React component bound to ready-made stylesheet assets in this store. */
  StaticAtom: StaticAtomComponent<TFile>;
  /** Updates runtime defaults and reconciles mounted atoms. */
  configure: StyleRuntime<TFile>["configure"];
  /** Keeps file atoms mounted without a React owner. */
  preload: StyleRuntime<TFile>["preload"];
  /** Keeps ready-made stylesheet assets mounted without a React owner. */
  preloadStylesheets: StyleRuntime<TFile>["preloadStylesheets"];
  /** Calls the loader again for mounted file atoms. */
  reload: StyleRuntime<TFile>["reload"];
  /** Retries failed atoms, or one atom when an id is supplied. */
  retry: StyleRuntime<TFile>["retry"];
  /** Returns a read-only diagnostic report. */
  inspect: StyleRuntime<TFile>["inspect"];
  /** Replaces mounted file CSS without calling the loader. */
  replace: (styles: readonly StyleAtomCssReplacement<TFile>[]) => void;
  /** Releases every atom owned by this store. */
  dispose: () => void;
};

type NormalizedScope = {
  enabled: boolean;
  classNames: string[];
  defaultSelector: boolean;
  element?: React.ElementType;
  props?: React.HTMLAttributes<HTMLElement> & Record<string, unknown>;
};

const CollectorContext = React.createContext<StyleCollector | null>(null);

let reactAtomCounter = 0;

/**---
 * ## ![logo](https://github.com/voodoofugu/styled-atom/raw/main/src/assets/styled-atom-logo.png)
 * ### ***StyleCollectorProviderProps***:
 * props for `StyleCollectorProvider`.
 */
export type StyleCollectorProviderProps = {
  /** Per-request collector that receives ready head styles. */
  collector: StyleCollector;
  /** Server-rendered React subtree that owns the collected styles. */
  children?: React.ReactNode;
};

/**---
 * ## ![logo](https://github.com/voodoofugu/styled-atom/raw/main/src/assets/styled-atom-logo.png)
 * ### ***StyleCollectorProvider***:
 * makes an SSR style collector available to descendant `StyledAtom` nodes.
 */
export const StyleCollectorProvider = ({
  collector,
  children,
}: StyleCollectorProviderProps) => (
  <CollectorContext.Provider value={collector}>
    {children}
  </CollectorContext.Provider>
);

const splitClassNames = (value?: string | readonly string[]) => {
  const values = Array.isArray(value) ? value : value ? [value] : [];
  return values.flatMap((item) => item.split(/\s+/).filter(Boolean));
};

const normalizeScope = (scope?: StyleScope): NormalizedScope => {
  if (!scope) {
    return { enabled: false, classNames: [], defaultSelector: false };
  }
  if (scope === true) {
    return { enabled: true, classNames: [], defaultSelector: true };
  }
  if (typeof scope === "string") {
    return {
      enabled: true,
      classNames: splitClassNames(scope),
      defaultSelector: false,
    };
  }
  const { element, className, ...props } = scope;
  const classNames = splitClassNames(className);
  return {
    enabled: true,
    classNames,
    defaultSelector: classNames.length === 0,
    element,
    props,
  };
};

const cssEscape = (value: string) => {
  const cssApi = globalThis.CSS as { escape?: (input: string) => string } | undefined;
  if (cssApi?.escape) return cssApi.escape(value);
  return value.replace(/(^-?\d|[^a-zA-Z0-9_-])/g, (part) => {
    const codePoint = part.codePointAt(0)?.toString(16) ?? "";
    return `\\${codePoint} `;
  });
};

const scopeClassNames = (
  scope: NormalizedScope,
  files: readonly string[],
  inlineName?: string,
) =>
  Array.from(
    new Set(
      (scope.defaultSelector
        ? [...scope.classNames, ...files, ...(inlineName ? [inlineName] : [])]
        : scope.classNames
      ).filter(Boolean),
    ),
  );

const scopeSelector = (
  scope: NormalizedScope,
  files: readonly string[],
  inlineName?: string,
) => {
  if (!scope.enabled) return null;
  const classes = scopeClassNames(scope, files, inlineName)
    .map((name) => `.${cssEscape(name)}`)
    .join("");
  return classes || null;
};

type CachedStyle = {
  css: string;
  fingerprint?: string;
};

const styleCache = new WeakMap<object, Map<string, CachedStyle>>();

const styleFingerprint = (styles?: StyledAtomStyles) => {
  if (!styles) return undefined;
  if (!isDevelopmentEnvironment()) {
    return undefined;
  }
  try {
    return JSON.stringify(styles);
  } catch {
    return "[unserializable-style-object]";
  }
};

const compileCached = (
  name: string,
  styles: StyledAtomStyles,
  selector?: string | null,
  fingerprint?: string,
) => {
  let variants = styleCache.get(styles);
  if (!variants) {
    variants = new Map();
    styleCache.set(styles, variants);
  }
  const key = `${name}\u0000${selector ?? ""}`;
  const cached = variants.get(key);
  if (cached && cached.fingerprint === fingerprint) return cached.css;
  if (cached && fingerprint !== undefined) {
    console.warn(
      `[styled-atom] The style object for "${name}" was mutated after compilation. Style objects should be immutable; the CSS was recompiled for development.`,
    );
  }
  const css = compileStyleAtomStyles(name, styles, selector);
  variants.set(key, { css, fingerprint });
  return css;
};

const filesList = <TFile extends string>(files?: StyleAtomFiles<TFile>) =>
  Array.isArray(files) ? [...files] : files ? [files] : [];

const renderValue = (
  value: StyledAtomChildren | StyledAtomFallback | undefined,
  state: StyledAtomRenderState,
) => (typeof value === "function" ? value(state) : value);

const createAtomKey = (options: StyleAtomOptions) =>
  JSON.stringify({
    files: filesList(options.files),
    stylesheets: filesList(options.stylesheets),
    inlineStyle: options.inlineStyle ?? null,
    stylesheet: options.stylesheet ?? null,
    placement: options.placement ?? null,
    nonce: options.nonce ?? null,
    precedence: options.precedence ?? null,
  });

const useRuntimeAtom = <TFile extends string>(
  runtime: StyleRuntime<TFile>,
  id: string,
  options: StyleAtomOptions<TFile>,
) => {
  const controller = React.useRef<StyleAtomController<TFile> | null>(null);
  const key = createAtomKey(options);
  const serverSnapshot = React.useMemo(
    () => runtime.getServerSnapshot(id, options),
    // `key` tracks all serializable option content. `target` is identity-based.
    [runtime, id, key, options.target],
  );
  const getSnapshot = React.useCallback(
    () => controller.current?.getSnapshot() ?? serverSnapshot,
    [serverSnapshot],
  );
  const subscribe = React.useCallback(
    (listener: () => void) =>
      controller.current?.subscribe(listener) ?? (() => undefined),
    // Force useSyncExternalStore to attach to the replacement controller.
    [runtime, id, key, options.target],
  );

  React.useInsertionEffect(() => {
    const next = runtime.registerAtom({ ...options, id });
    controller.current = next;
    return () => {
      next.dispose();
      if (controller.current === next) controller.current = null;
    };
    // Option changes reconcile through the stable controller below.
  }, [runtime, id]);

  React.useLayoutEffect(() => {
    controller.current?.update(options);
  }, [runtime, id, key, options.target]);

  const snapshot = React.useSyncExternalStore(
    subscribe,
    getSnapshot,
    () => serverSnapshot,
  );

  return {
    snapshot,
    retry: React.useCallback(() => controller.current?.retry(), []),
  };
};

const createComponent = <TFile extends string>(
  runtime: StyleRuntime<TFile>,
  allowFiles: boolean,
  mode: "dynamic" | "static" = "dynamic",
) => {
  const Component = (
    props:
      | StyledAtomProps<TFile>
      | StoreStaticAtomProps<TFile>
      | StaticAtomProps,
  ) => {
    const {
      files,
      name,
      scope,
      inlinePlacement,
      target,
      nonce,
      precedence,
      renderWhenReady = false,
      fallback,
      errorFallback,
      children,
      onStatusChange,
      onReady,
      onError,
    } = props;
    const style = "style" in props ? props.style : undefined;
    const href = "href" in props ? props.href : undefined;
    const collector = React.useContext(CollectorContext);
    const placement =
      inlinePlacement === undefined
        ? undefined
        : inlinePlacement
          ? "inline"
          : "head";
    const resolvedPlacement = runtime.resolvePlacement(placement);

    if (mode === "dynamic" && !allowFiles && files !== undefined) {
      throw new Error(
        "[styled-atom] The standalone StyledAtom accepts inline name/style only. Use createStyledAtomStore() for CSS files.",
      );
    }
    const hasStyle = style !== undefined;
    if (hasStyle && (!name || !name.trim())) {
      throw new Error("[styled-atom] Inline style requires a non-empty name.");
    }
    if (hasStyle && (typeof style !== "object" || Array.isArray(style))) {
      throw new Error("[styled-atom] style must be an object.");
    }
    if (mode === "static" && !allowFiles && (!name?.trim() || !href?.trim())) {
      throw new Error(
        "[styled-atom] StaticAtom requires a non-empty name and href.",
      );
    }

    const [id] = React.useState(() => {
      reactAtomCounter += 1;
      return `${runtime.namespace}-react-${reactAtomCounter}`;
    });
    const [hydrationStyle] = React.useState(() => style);
    const fileNames = filesList(files);
    const normalizedScope = normalizeScope(scope);
    const inlineName = name?.trim();
    const selector = scopeSelector(normalizedScope, fileNames, inlineName);
    const fingerprint = styleFingerprint(mode === "dynamic" ? style : undefined);
    const hydrationCandidate = React.useMemo(
      () =>
        mode === "dynamic" && inlineName
          ? runtime.resolveHydratedInlineStyle(inlineName, {
              placement,
              target,
              precedence,
            })
          : undefined,
      [inlineName, mode, placement, precedence, runtime, target],
    );
    const shouldSign = Boolean(
      style &&
        inlineName &&
        style === hydrationStyle &&
        (collector || typeof document === "undefined" || hydrationCandidate),
    );
    const signature = React.useMemo(
      () =>
        shouldSign && style && inlineName
          ? createStyleAtomSignature(inlineName, style, selector)
          : undefined,
      [inlineName, selector, shouldSign, style],
    );
    const hydratedCss =
      signature && hydrationCandidate?.signature === signature
        ? hydrationCandidate.css
        : undefined;
    const css = React.useMemo(
      () =>
        style && inlineName
          ? hydratedCss ??
            compileCached(inlineName, style, selector, fingerprint)
          : undefined,
      [fingerprint, hydratedCss, inlineName, selector, style],
    );
    const atomOptions = React.useMemo<StyleAtomOptions<TFile>>(
      () => ({
        files: mode === "dynamic" ? files : undefined,
        stylesheets: mode === "static" && allowFiles ? files : undefined,
        stylesheet:
          mode === "static" && !allowFiles && inlineName && href
            ? { name: inlineName, href }
            : undefined,
        inlineStyle:
          mode === "dynamic" && css && inlineName
            ? { name: inlineName, css, signature }
            : undefined,
        placement,
        target,
        nonce,
        precedence,
      }),
      [
        allowFiles,
        files,
        css,
        href,
        inlineName,
        mode,
        signature,
        placement,
        target,
        nonce,
        precedence,
      ],
    );
    const { snapshot, retry } = useRuntimeAtom(runtime, id, atomOptions);
    const state = React.useMemo<StyledAtomRenderState>(
      () => ({ ...snapshot, retry }),
      [snapshot, retry],
    );
    if (collector && resolvedPlacement === "head") {
      runtime.collect(collector, snapshot, nonce);
    }

    const previousStatus = React.useRef<typeof snapshot.status | undefined>(
      undefined,
    );
    React.useEffect(() => {
      if (previousStatus.current !== snapshot.status) {
        onStatusChange?.(state);
        if (snapshot.status === "ready") onReady?.(state);
        if (snapshot.status === "failed") onError?.(state);
      }
      previousStatus.current = snapshot.status;
    }, [onError, onReady, onStatusChange, snapshot.status, state]);

    const blocking = renderWhenReady || fallback !== undefined;
    let content = renderValue(children, state);
    if (snapshot.status === "loading" && blocking) {
      content = renderValue(fallback, state) ?? null;
    } else if (snapshot.status === "failed" && errorFallback !== undefined) {
      content = renderValue(errorFallback, state) ?? null;
    } else if (snapshot.status === "failed" && renderWhenReady) {
      content = null;
    }

    const inlineStyles =
      resolvedPlacement === "inline"
        ? snapshot.styles.map((style) =>
            style.kind === "stylesheet" ? null : (
              <style
                sa-key={style.key}
                sa-namespace={runtime.namespace}
                sa-precedence={style.precedence}
                sa-signature={style.signature}
                key={style.key}
                nonce={runtime.resolveNonce(nonce)}
              >
                {style.css}
              </style>
            ),
          )
        : null;

    if (!normalizedScope.enabled) {
      return (
        <>
          {inlineStyles}
          {content}
        </>
      );
    }

    const Wrapper = normalizedScope.element ?? "div";
    const classes = scopeClassNames(normalizedScope, fileNames, inlineName);
    const nextProps: Record<string, unknown> = {
      ...normalizedScope.props,
      "sa-shell": "",
      "sa-status": snapshot.status,
      className: classes.join(" ") || undefined,
    };

    return (
      <Wrapper {...nextProps}>
        {inlineStyles}
        {content}
      </Wrapper>
    );
  };

  Component.displayName = mode === "static" ? "StaticAtom" : "StyledAtom";
  return Component;
};

const inlineRuntime = new StyleRuntime({ namespace: "inline" });

/**---
 * ## ![logo](https://github.com/voodoofugu/styled-atom/raw/main/src/assets/styled-atom-logo.png)
 * ### ***StyledAtom***:
 * standalone React component for one inline style atom. Use a store-bound
 * component when the atom also loads named CSS files.
 */
export const StyledAtom = createComponent(
  inlineRuntime,
  false,
) as React.FC<InlineStyledAtomProps>;

const staticRuntime = new StyleRuntime({ namespace: "static" });

/**---
 * ## ![logo](https://github.com/voodoofugu/styled-atom/raw/main/src/assets/styled-atom-logo.png)
 * ### ***StaticAtom***:
 * standalone React component for one ready-made stylesheet asset.
 */
export const StaticAtom = createComponent(
  staticRuntime,
  false,
  "static",
) as React.FC<StaticAtomProps>;

/**---
 * ## ![logo](https://github.com/voodoofugu/styled-atom/raw/main/src/assets/styled-atom-logo.png)
 * ### ***createStyledAtomStore***:
 * creates a React component and commands bound to one style runtime.
 */
export const createStyledAtomStore = <TFile extends string = string>(
  options: StyleRuntimeOptions<TFile> = {},
): StyledAtomStore<TFile> => {
  const runtime = new StyleRuntime(options);
  return {
    StyledAtom: createComponent(runtime, true),
    StaticAtom: createComponent(
      runtime,
      true,
      "static",
    ) as StaticAtomComponent<TFile>,
    configure: runtime.configure.bind(runtime),
    preload: runtime.preload.bind(runtime),
    preloadStylesheets: runtime.preloadStylesheets.bind(runtime),
    reload: runtime.reload.bind(runtime),
    retry: runtime.retry.bind(runtime),
    inspect: runtime.inspect.bind(runtime),
    replace: runtime.replace.bind(runtime),
    dispose: runtime.dispose.bind(runtime),
  };
};

export type {
  ImportStyle,
  StyleAtomCssReplacement,
  StyleAtomFiles,
  StyleAtomSnapshot,
  StyleCollector,
  StyledAtomStyles,
  StylePlacement,
  StyleRuntimeOptions,
  StyleRuntimeEntryInspection,
  StyleRuntimeInspection,
  StyleTargetValue,
  StylesheetManifest,
} from "./types";
