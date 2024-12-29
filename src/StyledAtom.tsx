import React from "react";
import { StyledAtomT } from "./types";

import useStore from "./useStore";

const StyledAtom = ({
  fileNames,
  encap,
  fallback,
  onLoad,
  children,
}: StyledAtomT) => {
  const [styleData, setStyleData] = useStore("styleData");

  const prevStylesLoaded = React.useRef(false);
  const id = `✦${React.useId()}`.replace(/[:]/g, "");

  const loaded = styleData?.[id]?.loaded ?? false;

  const content = encap ? (
    <div className={fileNames.join(" ")}>{children}</div>
  ) : (
    children
  );

  React.useEffect(() => {
    setStyleData((prevState) => ({
      ...prevState,
      [id]: {
        ...prevState?.[id],
        encap,
        fileNames,
      },
    }));

    return () => {
      setStyleData((prevState) => {
        if (!prevState) return null;
        const { [id]: unused, ...rest } = prevState; // eslint-disable-line @typescript-eslint/no-unused-vars
        return Object.keys(rest).length ? rest : null;
      });
      if (onLoad) {
        onLoad(false);
      }
      prevStylesLoaded.current = false;
    };
  }, [fileNames, id, setStyleData]);

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

  return loaded ? content : fallback || null;
};

export default StyledAtom;
