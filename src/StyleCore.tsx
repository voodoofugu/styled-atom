import { StyleCoreT } from "./types";

import useDynamicStyle from "./useDynamicStyle";

const StyleCore = ({ path }: StyleCoreT) => {
  useDynamicStyle(path);

  return null;
};
StyleCore.displayName = "✦StyleCore";

export default StyleCore;
