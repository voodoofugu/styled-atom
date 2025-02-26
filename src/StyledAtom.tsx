import React from "react";
import { StyledAtomT } from "./types";

import useStore from "./useStore";

const StyledAtom = ({
  fileNames = [],
  encap,
  fallback,
  onLoad,
  children,
}: StyledAtomT) => {
  if (fileNames.length === 0) {
    console.error(
      `Some StyledAtom was rendered with empty fileNames`,
      "\n",
      "✦styledAtom✦",
      "\n"
    );
    return fallback || children || null;
  }

  const [styleData, setStyleData] = useStore("styleData");

  const prevStylesLoaded = React.useRef(false);
  const id = `${React.useId()}`.replace(/^(.{2})(.*).$/, "✦$2");

  const loaded = styleData?.[id]?.loaded ?? false;

  const content = encap ? (
    <div
      atom-shell={id} // eslint-disable-line react/no-unknown-property
      className={`${fileNames.join(" ")}${
        typeof encap === "string" ? ` ${encap}` : ""
      }`}
    >
      {children}
    </div>
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
      prevStylesLoaded.current = false;
    };
  }, [fileNames, id, setStyleData]);

  React.useEffect(() => {
    if (onLoad && loaded && !prevStylesLoaded.current) {
      onLoad();
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
StyledAtom.displayName = "✦StyledAtom";

export default StyledAtom;
