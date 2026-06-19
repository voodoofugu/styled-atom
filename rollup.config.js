import resolve from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";
import terser from "@rollup/plugin-terser";
import del from "rollup-plugin-delete";
import commonjs from "@rollup/plugin-commonjs";

export default [
  // ESM точки входа
  {
    input: {
      index: "./src/index.ts",
    },
    external: ["react"],
    output: {
      dir: "dist/esm",
      format: "esm",
      entryFileNames: "[name].js",
    },
    plugins: [
      del({ targets: "dist/*" }),
      resolve(),
      commonjs(),
      typescript({
        tsconfig: "./tsconfig.rollup.json",
        compilerOptions: {
          outDir: "./dist/esm",
        },
      }),
      terser({
        compress: {
          passes: 2,
          unsafe: true,
          unsafe_arrows: true,
          unsafe_comps: true,
          unsafe_math: true,
          drop_console: true,
          pure_funcs: ["console.log"],
        },
        mangle: {
          toplevel: true,
        },
        output: {
          comments: false,
        },
      }),
    ],
  },

  // CJS точки входа
  {
    input: {
      index: "./src/index.ts",
    },
    external: ["react"],
    output: {
      dir: "dist/cjs",
      format: "cjs",
      entryFileNames: "[name].cjs",
      exports: "named",
    },
    plugins: [
      resolve(),
      commonjs(),
      typescript({
        tsconfig: "./tsconfig.rollup.json",
        compilerOptions: {
          outDir: "./dist/cjs",
        },
      }),
      terser({
        compress: {
          passes: 2,
          unsafe: true,
          unsafe_arrows: true,
          unsafe_comps: true,
          unsafe_math: true,
          drop_console: true,
          pure_funcs: ["console.log"],
        },
        mangle: {
          toplevel: true,
        },
        output: {
          comments: false,
        },
      }),
    ],
  },
];
