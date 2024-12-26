import React from "react";
import { StyledAtomT } from "./types";

import useStore from "./useStore";

const StyledAtom = ({ fileNames, children, onLoad }: StyledAtomT) => {
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

  const stylesLoaded = styleData?.[id]?.stylesLoaded ?? false;

  React.useEffect(() => {
    if (onLoad && stylesLoaded && !prevStylesLoaded.current) {
      onLoad(stylesLoaded);
      prevStylesLoaded.current = true;
    } else if (!stylesLoaded) {
      prevStylesLoaded.current = false;
    }
  }, [stylesLoaded, onLoad]);

  if (!children) {
    return null;
  }
  return stylesLoaded ? <>{children}</> : null;
};

export default StyledAtom;
