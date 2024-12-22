import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import typescript from "@rollup/plugin-typescript";
import terser from "@rollup/plugin-terser";
import del from "rollup-plugin-delete";

export default {
  input: "src/nexus.tsx",

  output: [
    {
      file: "dist/nexus.js",
      format: "cjs",
    },
    // {
    //   file: "dist/index.js",
    //   format: "esm",
    // },
  ],
  plugins: [
    del({ targets: "dist/*" }),
    resolve(),
    commonjs({
      ignoreGlobal: true, // Игнорирует преобразование `globalThis` для React
    }),
    typescript(),
    terser({
      output: {
        comments: false, // Удаляет все комментарии
      },
    }),
  ],
  external: (id) => /^react/.test(id),
};
