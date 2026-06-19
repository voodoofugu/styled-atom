import React from "react";
import {
  getStyledAtomWrapperProps,
  getStyleAtomKey,
  normalizeStyleAtomOptions,
  StyledAtomStore,
} from "./core";
import type {
  ImportStyleT,
  ReactStyledAtomStoreT,
  StyleAtomControllerT,
  StyleAtomSnapshotT,
  StyledAtomT,
} from "./types";

const initialSnapshot = (
  id: string,
  fileNames: string[],
  hasStyles: boolean,
): StyleAtomSnapshotT => ({
  id,
  loaded: !hasStyles,
  loading: hasStyles,
  fileNames,
  errors: [],
});

const createReactAtomId = (id: string) => {
  const suffix = id.replace(/[^a-zA-Z0-9_-]/g, "");

  return `styled-atom-${suffix}`;
};

const useStyledAtomController = (
  store: StyledAtomStore,
  id: string,
  props: StyledAtomT,
) => {
  const normalized = normalizeStyleAtomOptions(props);
  const atomKey = getStyleAtomKey(props);
  const hasStyles = normalized.fileNames.length > 0;
  const controllerRef = React.useRef<StyleAtomControllerT | null>(null);
  const cleanupRef = React.useRef<(() => void) | null>(null);
  const [snapshot, setSnapshot] = React.useState<StyleAtomSnapshotT>(() =>
    initialSnapshot(id, normalized.fileNames, hasStyles),
  );

  React.useEffect(() => {
    return () => {
      cleanupRef.current?.();
      cleanupRef.current = null;
      controllerRef.current = null;
    };
  }, [store, id]);

  React.useEffect(() => {
    if (!hasStyles) {
      cleanupRef.current?.();
      cleanupRef.current = null;
      controllerRef.current = null;
      setSnapshot(initialSnapshot(id, normalized.fileNames, hasStyles));
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

const createStyledAtomComponent = (store: StyledAtomStore) => {
  const StyledAtom = ({
    fileNames = [],
    encap,
    fallback,
    onLoad,
    children,
  }: StyledAtomT) => {
    const reactId = React.useId();
    const id = React.useMemo(() => createReactAtomId(reactId), [reactId]);
    const props = {
      fileNames,
      encap,
    };
    const { normalized, snapshot } = useStyledAtomController(store, id, props);
    const wasLoadedRef = React.useRef(snapshot.loaded);

    React.useEffect(() => {
      if (onLoad && snapshot.loaded && !wasLoadedRef.current) {
        onLoad();
      }

      wasLoadedRef.current = snapshot.loaded;
    }, [onLoad, snapshot.loaded]);

    if (normalized.fileNames.length === 0) {
      return fallback ?? children ?? null;
    }

    if (!children) {
      return null;
    }

    const wrapperProps = getStyledAtomWrapperProps(props);
    const content = wrapperProps ? (
      <div {...wrapperProps}>{children}</div>
    ) : (
      children
    );

    return snapshot.loaded ? content : (fallback ?? null);
  };

  StyledAtom.displayName = "StyledAtom";

  return StyledAtom;
};

/**---
 * ## ![logo](https://github.com/voodoofugu/styled-atom/raw/main/src/assets/styled-atom-logo.png)
 * ### ***createStyledAtomStore***:
 * create a store plus a React component bound to it.
 * @description
 * This is the React entry point. Use one returned object per shell, workbench or isolated UI surface so mounted atoms share a cache.
 * @returns a React-facing style atom runtime with `StyledAtom`, `configure`, `reload`, `replace` and `dispose`.
 * @example
 * ```tsx
 * export const styleAtoms = createStyledAtomStore(
 *   (name) => import(`./styles/${name}.css`),
 * );
 *
 * export const StyledAtom = styleAtoms.StyledAtom;
 * ```
 */
export const createStyledAtomStore = (
  path?: ImportStyleT,
): ReactStyledAtomStoreT => {
  const store = new StyledAtomStore(path);

  return {
    StyledAtom: createStyledAtomComponent(store),
    configure: store.configure.bind(store),
    reload: store.reload.bind(store),
    replace: store.replace.bind(store),
    dispose: store.dispose.bind(store),
  };
};
