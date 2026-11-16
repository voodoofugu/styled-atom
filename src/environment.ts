type ImportMetaEnvironment = ImportMeta & {
  env?: { DEV?: boolean; MODE?: string };
};

/** Detects development and test builds in Node and modern bundlers. */
export const isDevelopmentEnvironment = () => {
  const nodeEnvironment =
    typeof process === "undefined" ? undefined : process.env.NODE_ENV;
  if (nodeEnvironment) {
    return nodeEnvironment === "development" || nodeEnvironment === "test";
  }

  const bundlerEnvironment = (import.meta as ImportMetaEnvironment).env;
  return (
    bundlerEnvironment?.DEV === true ||
    bundlerEnvironment?.MODE === "development" ||
    bundlerEnvironment?.MODE === "test"
  );
};
