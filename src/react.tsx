import React from "react";
import {
  createStyleStore,
  getStyledAtomWrapperProps,
  getStyleAtomKey,
  normalizeStyleAtomOptions,
  StyledAtomStore,
} from "./core";
import type {
  StyleAtomControllerT,
  StyleAtomSnapshotT,
  StyledAtomStoreOptionsT,
  StyledAtomT,
} from "./types";

type ReactStyledAtomStoreT = {
  store: StyledAtomStore;
  StyledAtom: React.FC<StyledAtomT>;
  configure: StyledAtomStore["configure"];
  preload: StyledAtomStore["preload"];
  reload: StyledAtomStore["reload"];
  replace: StyledAtomStore["replace"];
  dispose: StyledAtomStore["dispose"];
};

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
  const hasStyles = normalized.fileNames.length > 0 || Boolean(normalized.css);
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

export const createStyledAtomComponent = (store: StyledAtomStore) => {
  const StyledAtom = ({
    fileNames = [],
    encap,
    fallback,
    onLoad,
    layer,
    css,
    children,
  }: StyledAtomT) => {
    const reactId = React.useId();
    const id = React.useMemo(() => createReactAtomId(reactId), [reactId]);
    const props = {
      fileNames,
      encap,
      layer,
      css,
    };
    const { normalized, snapshot } = useStyledAtomController(store, id, props);
    const wasLoadedRef = React.useRef(snapshot.loaded);

    React.useEffect(() => {
      if (onLoad && snapshot.loaded && !wasLoadedRef.current) {
        onLoad();
      }

      wasLoadedRef.current = snapshot.loaded;
    }, [onLoad, snapshot.loaded]);

    if (normalized.fileNames.length === 0 && !normalized.css) {
      return fallback ?? children ?? null;
    }

    if (!children) {
      return null;
    }

    const wrapperProps = getStyledAtomWrapperProps(props, id);
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

export const createStyledAtomStore = (
  options: StyledAtomStoreOptionsT = {},
): ReactStyledAtomStoreT => {
  const store = createStyleStore(options);

  return {
    store,
    StyledAtom: createStyledAtomComponent(store),
    configure: store.configure.bind(store),
    preload: store.preload.bind(store),
    reload: store.reload.bind(store),
    replace: store.replace.bind(store),
    dispose: store.dispose.bind(store),
  };
};
