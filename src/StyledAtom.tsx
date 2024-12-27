import React from "react";
import { StyledAtomT } from "./types";

import useStore from "./useStore";

const StyledAtom = ({ fileNames, fallback, onLoad, children }: StyledAtomT) => {
  const [styleData, setStyleData] = useStore("styleData");
  const prevStylesLoaded = React.useRef(false);

  const id = `✦${React.useId()}`.replace(/[:r]/g, "");

  React.useEffect(() => {
    setStyleData((prevState) => ({
      ...prevState,
      [id]: {
        ...prevState?.[id],
        fileNames,
      },
    }));

    return () => {
      setStyleData((prevState) => {
        if (!prevState) return null;
        const { [id]: unused, ...rest } = prevState; // eslint-disable-line @typescript-eslint/no-unused-vars
        return Object.keys(rest).length ? rest : null;
      });
      prevStylesLoaded.current = false;
    };
  }, [fileNames, id, setStyleData]);

  const loaded = styleData?.[id]?.loaded ?? false;

  React.useEffect(() => {
    if (onLoad && loaded && !prevStylesLoaded.current) {
      onLoad(loaded);
      prevStylesLoaded.current = true;
    } else if (!loaded) {
      prevStylesLoaded.current = false;
    }
  }, [loaded, onLoad]);

  if (!children) {
    return null;
  }
  return loaded ? <>{children}</> : fallback || null;
};

export default StyledAtom;
