import React from "react";

import useDynamicStyle, { ImportStyleT } from "./useDynamicStyle";
import { getAllStateValues, subscribeToAll } from "./proxyStyleData";

type StyleCoreT = {
  path: ImportStyleT;
  watch?: boolean;
};

const StyleCore = ({ path, watch }: StyleCoreT) => {
  useDynamicStyle(path);

  React.useEffect(() => {
    if (!watch) return;

    const initialState = getAllStateValues();
    const storedStyleData = sessionStorage.getItem("styledAtom💫");

    if (!storedStyleData) {
      sessionStorage.setItem("styledAtom💫", JSON.stringify(initialState));
    }

    const unsubscribe = subscribeToAll((updatedState) => {
      sessionStorage.setItem("styledAtom💫", JSON.stringify(updatedState));
    });

    return () => {
      unsubscribe();
      if (storedStyleData) {
        sessionStorage.removeItem("styledAtom💫");
      }
    };
  }, [watch]);

  return null;
};

export default StyleCore;
