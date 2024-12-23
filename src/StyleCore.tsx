import React from "react";
import { StyleDataT, StyleCoreT } from "./types";

import useDynamicStyle from "./useDynamicStyle";
import { getAllStateValues, subscribeToAll } from "./proxyStyleData";

const storageName = "styledAtom💫";
const emptySpace = "empty⭐️";

const removeStorage = () => {
  sessionStorage.removeItem(storageName);
};

const setStorage = (data: StyleDataT | string) => {
  sessionStorage.setItem(storageName, JSON.stringify(data));
};

const StyleCore = ({ path, watch }: StyleCoreT) => {
  useDynamicStyle(path);

  const storedStyleData = sessionStorage.getItem(storageName);
  const initialState = getAllStateValues();

  if (!watch) {
    if (storedStyleData) {
      removeStorage();
    }
    return;
  }

  if (!storedStyleData) {
    if (!initialState.styleData) {
      setStorage(emptySpace);
      return;
    }

    setStorage(initialState.styleData);
  }

  const unsubscribe = subscribeToAll((updatedState) => {
    if (!updatedState.styleData) {
      setStorage(emptySpace);
      return;
    }

    setStorage(updatedState.styleData);
  });

  React.useEffect(() => {
    return () => {
      unsubscribe();
      if (storedStyleData) {
        removeStorage();
      }
    };
  }, []);

  return null;
};

export default StyleCore;
