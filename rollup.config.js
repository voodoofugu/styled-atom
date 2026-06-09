import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import typescript from "@rollup/plugin-typescript";
import terser from "@rollup/plugin-terser";
import del from "rollup-plugin-delete";

export default {
  input: {
    index: "src/index.ts",
    core: "src/core.ts",
  },

  output: [
    {
      dir: "dist",
      format: "esm",
      entryFileNames: "[name].js",
    },
    {
      dir: "dist",
      format: "cjs",
      entryFileNames: "[name].cjs",
      exports: "named",
    },
  ],
  plugins: [
    del({ targets: "dist/*" }),
    resolve(),
    commonjs(),
    typescript(),
    terser({
      output: {
        comments: false,
      },
    }),
  ],
  external: (id) => /^react(\/.*)?$/.test(id),
};
