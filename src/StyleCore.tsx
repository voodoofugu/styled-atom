// import React from "react";
import {
  // StyleDataT,
  StyleCoreT,
} from "./types";

import useDynamicStyle from "./useDynamicStyle";
// import { getState, subscribeToAll } from "./proxyStyleData";

// const storageName = "✦styledAtom✦";
// const emptySpace = "empty";

// const storageHandler = (type: "set" | "remove", data?: StyleDataT | string) => {
//   if (typeof window === "undefined") return;
//   if (type === "set") {
//     sessionStorage.setItem(storageName, JSON.stringify(data));
//   } else {
//     sessionStorage.removeItem(storageName);
//   }
// };

const StyleCore = ({
  path,
}: // watch
StyleCoreT) => {
  useDynamicStyle(path);
  // const initialState = getAllStateValues();

  // React.useEffect(() => {
  //   const storedStyleData = sessionStorage.getItem(storageName);

  //   if (!watch) {
  //     if (storedStyleData) {
  //       storageHandler("remove");
  //     }
  //     return;
  //   }

  //   if (!storedStyleData) {
  //     if (!initialState.styleData) {
  //       storageHandler("set", emptySpace);
  //       return;
  //     }

  //     storageHandler("set", initialState.styleData);
  //   }

  //   const unsubscribe = subscribeToAll((updatedState) => {
  //     if (!updatedState.styleData) {
  //       storageHandler("set", emptySpace);
  //       return;
  //     }

  //     storageHandler("set", updatedState.styleData);
  //   });

  //   return () => {
  //     unsubscribe();
  //     if (storedStyleData) {
  //       storageHandler("remove");
  //     }
  //   };
  // }, [initialState])

  return null;
};

export default StyleCore;
