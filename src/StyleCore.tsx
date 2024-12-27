import React from "react";
import { StyleDataT, StyleCoreT } from "./types";

import useDynamicStyle from "./useDynamicStyle";
import { getAllStateValues, subscribeToAll } from "./proxyStyleData";

const storageName = "✦styledAtom✦";
const emptySpace = "empty";

const removeStorage = () => {
  sessionStorage.removeItem(storageName);
};

const setStorage = (data: StyleDataT | string) => {
  sessionStorage.setItem(storageName, JSON.stringify(data));
};

const StyleCore = ({ path, watch }: StyleCoreT) => {
  useDynamicStyle(path);
  const initialState = getAllStateValues();

  React.useEffect(() => {
    const storedStyleData = sessionStorage.getItem(storageName);

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

    return () => {
      unsubscribe();
      if (storedStyleData) {
        removeStorage();
      }
    };
  }, [initialState]);

  return null;
};

export default StyleCore;
