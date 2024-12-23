import React from "react";
import useStore from "./useStore";

type StyleTagProps = {
  fileNames: string[];
  children?: React.ReactNode;
};

const StyleTag = ({ fileNames, children }: StyleTagProps) => {
  const [styleData, setStyleData] = useStore("styleData");

  const id = `${React.useId()}💫`.replace(/:/g, "");

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
        return rest;
      });
    };
  }, [fileNames, id]);

  const stylesLoaded = styleData?.[id]?.stylesLoaded ?? false;

  return stylesLoaded ? <>{children}</> : null;
};

export default StyleTag;
