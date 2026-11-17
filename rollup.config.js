import commonjs from "@rollup/plugin-commonjs";
import resolve from "@rollup/plugin-node-resolve";
import terser from "@rollup/plugin-terser";
import typescript from "@rollup/plugin-typescript";
import dts from "rollup-plugin-dts";
import del from "rollup-plugin-delete";

const entries = {
  index: "./src/index.ts",
  react: "./src/react.tsx",
};

const external = (id) => /^react(?:\/|$)/.test(id);

const preserveClientDirective = () => ({
  name: "preserve-client-directive",
  generateBundle(_options, bundle) {
    Object.values(bundle).forEach((output) => {
      if (output.type === "chunk" && output.isEntry && output.name === "react") {
        output.code = `"use client";${output.code}`;
      }
    });
  },
});

const plugins = (clean) => [
  ...(clean ? [del({ targets: "dist/*" })] : []),
  resolve(),
  commonjs(),
  typescript({ tsconfig: "./tsconfig.rollup.json", declaration: false }),
  terser({
    ecma: 2019,
    compress: {
      ecma: 2019,
      passes: 2,
      unsafe: true,
      unsafe_comps: true,
      unsafe_math: true,
      drop_console: ["log"],
      pure_funcs: ["console.log"],
    },
    mangle: { toplevel: true },
    output: { comments: false, ecma: 2019 },
  }),
  preserveClientDirective(),
];

const declarationBuilds = (directory, entryFileNames = "[name].d.ts") =>
  Object.entries(entries).map(([name, input]) => ({
    input: { [name]: input },
    output: {
      dir: directory,
      format: "es",
      entryFileNames,
    },
    plugins: [dts({ tsconfig: "./tsconfig.json" })],
    external,
  }));

export default [
  {
    input: entries,
    output: {
      dir: "dist/esm",
      format: "esm",
      entryFileNames: "[name].js",
    },
    plugins: plugins(true),
    external,
  },
  {
    input: entries,
    output: {
      dir: "dist/cjs",
      format: "cjs",
      entryFileNames: "[name].js",
      exports: "named",
    },
    plugins: plugins(false),
    external,
  },
  ...declarationBuilds("dist/esm"),
  ...declarationBuilds("dist/cjs", "[name].d.cts"),
];
