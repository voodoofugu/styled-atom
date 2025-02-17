import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import typescript from "@rollup/plugin-typescript";
import terser from "@rollup/plugin-terser";
import del from "rollup-plugin-delete";

export default {
  input: "src/index.ts",

  output: [
    {
      file: "dist/index.js",
      format: "cjs",
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
  external: (id) => /^react/.test(id),
};
