import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import ts from "typescript";

const root = path.resolve(import.meta.dirname, "..");
let compileStyleAtomStyles;

async function loadStyleCompiler() {
  if (compileStyleAtomStyles) return compileStyleAtomStyles;

  const source = await readFile(path.join(root, "src/styles.ts"), "utf8");
  const js = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2020,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText;
  const module = await import(
    `data:text/javascript;base64,${Buffer.from(js).toString("base64")}`
  );

  compileStyleAtomStyles = module.compileStyleAtomStyles;
  return compileStyleAtomStyles;
}

test("compileStyleAtomStyles scopes every selector in nested selector lists", async () => {
  const compile = await loadStyleCompiler();
  const css = compile("demo-workbench", {
    '.demo-workbench-shell[data-demo-workbench-theme="dark"]': {
      ".demo-workbench-card, .demo-workbench-scroll-progress, .demo-workbench-not-found-card":
        {
          color: "#fff",
        },
    },
  });

  assert.equal(
    css,
    `.demo-workbench .demo-workbench-shell[data-demo-workbench-theme="dark"] .demo-workbench-card, .demo-workbench .demo-workbench-shell[data-demo-workbench-theme="dark"] .demo-workbench-scroll-progress, .demo-workbench .demo-workbench-shell[data-demo-workbench-theme="dark"] .demo-workbench-not-found-card {\n  color: #fff;\n}`,
  );
});

test("compileStyleAtomStyles crosses parent and child selector lists", async () => {
  const compile = await loadStyleCompiler();
  const css = compile("demo", {
    ".button, .link": {
      "&:hover, &.active": {
        color: "blue",
      },
    },
  });

  assert.equal(
    css,
    `.demo .button:hover, .demo .button.active, .demo .link:hover, .demo .link.active {\n  color: blue;\n}`,
  );
});

test("compileStyleAtomStyles keeps nested commas inside selector functions and attributes", async () => {
  const compile = await loadStyleCompiler();
  const css = compile("demo", {
    '.item:is(.primary, .active), [data-label=","]': {
      content: "",
    },
  });

  assert.equal(
    css,
    `.demo .item:is(.primary, .active), .demo[data-label=","] {\n  content: "";\n}`,
  );
});
