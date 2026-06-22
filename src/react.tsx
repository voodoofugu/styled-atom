import React from "react";
import {
  getStyledAtomWrapperSelector,
  getStyledAtomWrapperProps,
  getStyleAtomKey,
  normalizeStyleAtomOptions,
  StyledAtomStore,
} from "./core";
import { compileStyleAtomStyles } from "./styles";
import type {
  ImportStyleT,
  ReactStyledAtomStoreT,
  StyleAtomControllerT,
  StyleAtomOptionsT,
  StyleAtomSnapshotT,
  StyledAtomImportT,
  StyledAtomInlineT,
  StyleAtomCssReplacementT,
  StyledAtomImportComponentT,
  StyleAtomFilesT,
} from "./types";

const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? React.useEffect : React.useLayoutEffect;

const initialSnapshot = (
  id: string,
  files: string[],
  hasStyles: boolean,
): StyleAtomSnapshotT => ({
  id,
  loaded: !hasStyles,
  loading: hasStyles,
  files,
  errors: [],
});

const createReactAtomId = (id: string) => {
  const suffix = id.replace(/[^a-zA-Z0-9_-]/g, "");

  return `styled-atom-${suffix}`;
};

const useStyledAtomController = (
  store: StyledAtomStore,
  id: string,
  props: StyleAtomOptionsT,
) => {
  const normalized = normalizeStyleAtomOptions(props);
  const atomKey = getStyleAtomKey(props);
  const hasStyles =
    normalized.files.length > 0 || Boolean(normalized.inlineStyle);
  const controllerRef = React.useRef<StyleAtomControllerT | null>(null);
  const cleanupRef = React.useRef<(() => void) | null>(null);
  const [snapshot, setSnapshot] = React.useState<StyleAtomSnapshotT>(() =>
    initialSnapshot(id, normalized.files, hasStyles),
  );

  React.useEffect(() => {
    return () => {
      cleanupRef.current?.();
      cleanupRef.current = null;
      controllerRef.current = null;
    };
  }, [store, id]);

  useIsomorphicLayoutEffect(() => {
    if (!hasStyles) {
      cleanupRef.current?.();
      cleanupRef.current = null;
      controllerRef.current = null;
      setSnapshot(initialSnapshot(id, normalized.files, hasStyles));
      return;
    }

    if (!controllerRef.current) {
      const controller = store.registerAtom({ ...props, id });
      const unsubscribe = controller.subscribe(() => {
        setSnapshot(controller.getSnapshot());
      });

      controllerRef.current = controller;
      cleanupRef.current = () => {
        unsubscribe();
        controller.dispose();
      };
    } else {
      controllerRef.current.update(props);
    }

    setSnapshot(controllerRef.current.getSnapshot());
    // `atomKey` is a content key, so inline arrays/objects with the same values
    // do not cause a store update.
  }, [atomKey, hasStyles, id, store]);

  return { normalized, snapshot };
};

const hasPropValue = (props: object, key: string) =>
  Object.prototype.hasOwnProperty.call(props, key) &&
  (props as Record<string, unknown>)[key] !== undefined;

const isStyleObject = (value: unknown) =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const validateStoreStyledAtomProps = (props: StyledAtomImportT) => {
  if (hasPropValue(props, "name") || hasPropValue(props, "styles")) {
    throw new Error(
      "`styleAtomsStore.StyledAtom` only accepts `files`. Import `StyledAtom` from `styled-atom` directly for inline `name` and `styles`.",
    );
  }
};

const validateInlineStyledAtomProps = (props: StyledAtomInlineT) => {
  if (hasPropValue(props, "files")) {
    throw new Error(
      "`StyledAtom` inline mode does not accept `files`. Use `createStyledAtomStore` for imported CSS files.",
    );
  }

  if (typeof props.name !== "string" || props.name.trim().length === 0) {
    throw new Error("`StyledAtom` inline mode requires a non-empty `name`.");
  }

  if (!isStyleObject(props.styles)) {
    throw new Error(
      "`StyledAtom` inline mode requires `styles` to be an object.",
    );
  }
};

const RuntimeStyledAtom = ({
  store,
  options,
  fallback,
  onLoad,
  children,
}: {
  store: StyledAtomStore;
  options: StyleAtomOptionsT;
  fallback?: React.ReactNode;
  onLoad?: () => void;
  children?: React.ReactNode;
}) => {
  const reactId = React.useId();
  const id = React.useMemo(() => createReactAtomId(reactId), [reactId]);
  const { normalized, snapshot } = useStyledAtomController(store, id, options);
  const wasLoadedRef = React.useRef(snapshot.loaded);

  React.useEffect(() => {
    if (onLoad && snapshot.loaded && !wasLoadedRef.current) {
      onLoad();
    }

    wasLoadedRef.current = snapshot.loaded;
  }, [onLoad, snapshot.loaded]);

  if (normalized.files.length === 0 && !normalized.inlineStyle) {
    return fallback ?? children ?? null;
  }

  if (!children) {
    return null;
  }

  const wrapperProps = getStyledAtomWrapperProps(options);
  const content = wrapperProps ? (
    <div {...wrapperProps}>{children}</div>
  ) : (
    children
  );

  return snapshot.loaded ? content : (fallback ?? null);
};

const createStyledAtomComponent = (store: StyledAtomStore) => {
  const StyledAtom = (props: StyledAtomImportT) => {
    validateStoreStyledAtomProps(props);

    const { files, encap, fallback, onLoad, children } = props;

    return (
      <RuntimeStyledAtom
        store={store}
        options={{ files, encap }}
        fallback={fallback}
        onLoad={onLoad}
      >
        {children}
      </RuntimeStyledAtom>
    );
  };

  StyledAtom.displayName = "StyledAtom";

  return StyledAtom;
};

const createInlineStyledAtomComponent = (store: StyledAtomStore) => {
  const StyledAtom = (props: StyledAtomInlineT) => {
    validateInlineStyledAtomProps(props);

    const { name, styles, encap, fallback, onLoad, children } = props;
    const inlineName = name.trim();
    const scopeSelector = getStyledAtomWrapperSelector({
      encap,
      inlineStyle: {
        name: inlineName,
        css: "",
      },
    });
    const css = compileStyleAtomStyles(inlineName, styles, scopeSelector);

    return (
      <RuntimeStyledAtom
        store={store}
        options={{
          encap,
          inlineStyle: {
            name: inlineName,
            css,
          },
        }}
        fallback={fallback}
        onLoad={onLoad}
      >
        {children}
      </RuntimeStyledAtom>
    );
  };

  StyledAtom.displayName = "StyledAtom";

  return StyledAtom;
};

const inlineStyleStore = new StyledAtomStore();

export const StyledAtom = createInlineStyledAtomComponent(inlineStyleStore);

/**---
 * ## ![logo](https://github.com/voodoofugu/styled-atom/raw/main/src/assets/styled-atom-logo.png)
 * ### ***createStyledAtomStore***:
 * create a store plus a React component bound to it.
 * @description
 * This is the React entry point. Use one returned object per shell, workbench or isolated UI surface so mounted atoms share a cache.
 * @returns a React-facing style atom runtime with `StyledAtom`, `configure`, `reload`, `replace` and `dispose`.
 * @example
 * ```tsx
 * export const styleAtomsStore = createStyledAtomStore(
 *   (name) => import(`./styles/${name}.css`),
 * );
 *
 * export const StyledAtomImport = styleAtomsStore.StyledAtom;
 * ```
 */
export const createStyledAtomStore = <TFile extends string = string>(
  path?: ImportStyleT<TFile>,
): ReactStyledAtomStoreT<TFile> => {
  const store = new StyledAtomStore(path as ImportStyleT);

  return {
    StyledAtom: createStyledAtomComponent(
      store,
    ) as StyledAtomImportComponentT<TFile>,
    configure: store.configure.bind(store) as (
      path?: ImportStyleT<TFile>,
    ) => void,
    reload: store.reload.bind(store) as (
      files?: StyleAtomFilesT<TFile>,
    ) => void,
    replace: store.replace.bind(store) as (
      styles: readonly StyleAtomCssReplacementT<TFile>[],
    ) => void,
    dispose: store.dispose.bind(store),
  };
};
