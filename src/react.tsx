import React from "react";

import { StyleRuntime } from "./core";
import { compileStyleAtomStyles } from "./styles";
import type {
  ImportStyle,
  StyleAtomController,
  StyleAtomCssReplacement,
  StyleAtomFiles,
  StyleAtomOptions,
  StyleAtomSnapshot,
  StyleCollector,
  StyledAtomStyles,
  StylePlacement,
  StyleRuntimeOptions,
  StyleTargetValue,
} from "./types";

export type StyleScope =
  | boolean
  | string
  | {
      className?: string | readonly string[];
      id?: string;
      attribute?: Record<string, string>;
    };

export type StyledAtomRenderState = StyleAtomSnapshot & {
  retry: () => void;
};

export type StyledAtomChildren =
  | React.ReactNode
  | ((state: StyledAtomRenderState) => React.ReactNode);

export type StyledAtomFallback =
  | React.ReactNode
  | ((state: StyledAtomRenderState) => React.ReactNode);

type StyledAtomSharedProps = {
  scope?: StyleScope;
  placement?: StylePlacement;
  target?: StyleTargetValue;
  nonce?: string;
  precedence?: number;
  render?: "eager" | "ready";
  fallback?: StyledAtomFallback;
  errorFallback?: StyledAtomFallback;
  children?: StyledAtomChildren;
  as?: React.ElementType;
  wrapperProps?: React.HTMLAttributes<HTMLElement> & Record<string, unknown>;
  statusAttribute?: boolean | string;
  onStatusChange?: (state: StyledAtomRenderState) => void;
  onReady?: (state: StyledAtomRenderState) => void;
  onError?: (state: StyledAtomRenderState) => void;
};

type StyledAtomSource<TFile extends string> =
  | {
      files: StyleAtomFiles<TFile>;
      name?: never;
      styles?: never;
    }
  | {
      files?: StyleAtomFiles<TFile>;
      name: string;
      styles: StyledAtomStyles;
    };

export type StyledAtomProps<TFile extends string = string> =
  StyledAtomSharedProps & StyledAtomSource<TFile>;

export type InlineStyledAtomProps = StyledAtomSharedProps & {
  files?: never;
  name: string;
  styles: StyledAtomStyles;
};

export type StyledAtomComponent<TFile extends string = string> = React.FC<
  StyledAtomProps<TFile>
>;

export type StyledAtomStore<TFile extends string = string> = {
  StyledAtom: StyledAtomComponent<TFile>;
  runtime: StyleRuntime<TFile>;
  configure: StyleRuntime<TFile>["configure"];
  preload: StyleRuntime<TFile>["preload"];
  reload: StyleRuntime<TFile>["reload"];
  retry: StyleRuntime<TFile>["retry"];
  inspect: StyleRuntime<TFile>["inspect"];
  replace: (styles: readonly StyleAtomCssReplacement<TFile>[]) => void;
  dispose: () => void;
};

type NormalizedScope = {
  enabled: boolean;
  classNames: string[];
  id?: string;
  attributes?: Record<string, string>;
  defaultSelector: boolean;
};

const CollectorContext = React.createContext<StyleCollector | null>(null);

let reactAtomCounter = 0;

export const StyleCollectorProvider = ({
  collector,
  children,
}: {
  collector: StyleCollector;
  children?: React.ReactNode;
}) => (
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
  const classNames = splitClassNames(scope.className);
  const id = scope.id?.trim() || undefined;
  const attributes = scope.attribute
    ? Object.fromEntries(
        Object.entries(scope.attribute).filter(
          ([name, value]) => name.length > 0 && typeof value === "string",
        ),
      )
    : undefined;
  const explicit = Boolean(
    classNames.length || id || (attributes && Object.keys(attributes).length),
  );
  return {
    enabled: true,
    classNames,
    id,
    attributes,
    defaultSelector: !explicit,
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

const cssStringEscape = (value: string) =>
  value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\a ");

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
  const id = scope.id ? `#${cssEscape(scope.id)}` : "";
  const attributes = scope.attributes
    ? Object.entries(scope.attributes)
        .map(([name, value]) =>
          value
            ? `[${cssEscape(name)}="${cssStringEscape(value)}"]`
            : `[${cssEscape(name)}]`,
        )
        .join("")
    : "";
  const classes = scopeClassNames(scope, files, inlineName)
    .map((name) => `.${cssEscape(name)}`)
    .join("");
  return `${id}${attributes}${classes}` || null;
};

type CachedStyle = {
  css: string;
  fingerprint?: string;
};

const styleCache = new WeakMap<object, Map<string, CachedStyle>>();

const styleFingerprint = (styles?: StyledAtomStyles) => {
  if (!styles) return undefined;
  const environment = (
    globalThis as { process?: { env?: { NODE_ENV?: string } } }
  ).process?.env?.NODE_ENV;
  if (environment !== "development" && environment !== "test") {
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
    inlineStyle: options.inlineStyle ?? null,
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
) => {
  const Component = (props: StyledAtomProps<TFile>) => {
    const {
      files,
      name,
      styles,
      scope,
      placement,
      target,
      nonce,
      precedence,
      render = "eager",
      fallback,
      errorFallback,
      children,
      as: Wrapper = "div",
      wrapperProps,
      statusAttribute = true,
      onStatusChange,
      onReady,
      onError,
    } = props;

    if (!allowFiles && files !== undefined) {
      throw new Error(
        "[styled-atom] The standalone StyledAtom accepts inline name/styles only. Use createStyledAtomStore() for CSS files.",
      );
    }
    const hasStyles = styles !== undefined;
    if (hasStyles && (!name || !name.trim())) {
      throw new Error("[styled-atom] Inline styles require a non-empty name.");
    }
    if (hasStyles && (typeof styles !== "object" || Array.isArray(styles))) {
      throw new Error("[styled-atom] styles must be an object.");
    }

    const [id] = React.useState(() => {
      reactAtomCounter += 1;
      return `${runtime.namespace}-react-${reactAtomCounter}`;
    });
    const fileNames = filesList(files);
    const normalizedScope = normalizeScope(scope);
    const inlineName = name?.trim();
    const selector = scopeSelector(normalizedScope, fileNames, inlineName);
    const fingerprint = styleFingerprint(styles);
    const css = React.useMemo(
      () =>
        styles && inlineName
          ? compileCached(inlineName, styles, selector, fingerprint)
          : undefined,
      [fingerprint, inlineName, selector, styles],
    );
    const atomOptions = React.useMemo<StyleAtomOptions<TFile>>(
      () => ({
        files,
        inlineStyle: css && inlineName ? { name: inlineName, css } : undefined,
        placement,
        target,
        nonce,
        precedence,
      }),
      [files, css, inlineName, placement, target, nonce, precedence],
    );
    const { snapshot, retry } = useRuntimeAtom(runtime, id, atomOptions);
    const state = React.useMemo<StyledAtomRenderState>(
      () => ({ ...snapshot, retry }),
      [snapshot, retry],
    );
    const collector = React.useContext(CollectorContext);
    const resolvedPlacement = runtime.resolvePlacement(placement);

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

    const blocking = render === "ready" || fallback !== undefined;
    let content = renderValue(children, state);
    if (snapshot.status === "loading" && blocking) {
      content = renderValue(fallback, state) ?? null;
    } else if (snapshot.status === "failed" && errorFallback !== undefined) {
      content = renderValue(errorFallback, state) ?? null;
    } else if (snapshot.status === "failed" && render === "ready") {
      content = null;
    }

    const inlineStyles =
      resolvedPlacement === "inline"
        ? snapshot.styles.map((style) => (
            <style
              data-styled-atom-key={style.key}
              data-styled-atom-namespace={runtime.namespace}
              data-styled-atom-precedence={style.precedence}
              key={style.key}
              nonce={runtime.resolveNonce(nonce)}
            >
              {style.css}
            </style>
          ))
        : null;

    if (!normalizedScope.enabled) {
      return (
        <>
          {inlineStyles}
          {content}
        </>
      );
    }

    const classes = scopeClassNames(normalizedScope, fileNames, inlineName);
    const userClassName = wrapperProps?.className;
    const nextProps: Record<string, unknown> = {
      ...wrapperProps,
      ...normalizedScope.attributes,
      "data-styled-atom-shell": "",
      id: normalizedScope.id ?? wrapperProps?.id,
      className: [...classes, ...(userClassName ? [userClassName] : [])].join(" ") || undefined,
    };
    if (statusAttribute) {
      nextProps[
        typeof statusAttribute === "string"
          ? statusAttribute
          : "data-styled-atom-status"
      ] = snapshot.status;
    }

    return (
      <Wrapper {...nextProps}>
        {inlineStyles}
        {content}
      </Wrapper>
    );
  };

  Component.displayName = "StyledAtom";
  return Component;
};

const inlineRuntime = new StyleRuntime({ namespace: "inline" });

export const StyledAtom = createComponent(
  inlineRuntime,
  false,
) as React.FC<InlineStyledAtomProps>;

export const createStyledAtomStore = <TFile extends string = string>(
  options: StyleRuntimeOptions<TFile> | ImportStyle<TFile> = {},
): StyledAtomStore<TFile> => {
  const runtime = new StyleRuntime(options);
  return {
    StyledAtom: createComponent(runtime, true),
    runtime,
    configure: runtime.configure.bind(runtime),
    preload: runtime.preload.bind(runtime),
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
} from "./types";
