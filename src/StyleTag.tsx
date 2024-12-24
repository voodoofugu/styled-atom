import React from "react";
import { StyleTagT } from "./types";

import useStore from "./useStore";

const StyleTag = ({ fileNames, children }: StyleTagT) => {
  const [styleData, setStyleData] = useStore("styleData");

  const id = `${React.useId()}⭐️`.replace(/:/g, "");

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
        return rest.length ? { ...rest } : null;
      });
    };
  }, [fileNames, id]);

  const stylesLoaded = styleData?.[id]?.stylesLoaded ?? false;

  return stylesLoaded ? <>{children}</> : null;
};

export default StyleTag;
