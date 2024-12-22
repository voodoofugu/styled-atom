import React from "react";

import useDynamicStyle from "./useDynamicStyle";

const StyleTagCore: React.FC = () => {
  useDynamicStyle((name: string) => import(`../../style/css/${name}.css`));

  return null;
};

export default StyleTagCore;
