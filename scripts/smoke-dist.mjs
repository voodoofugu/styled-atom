import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const esmCore = await import("../dist/esm/index.js");
const esmReact = await import("../dist/esm/react.js");
const cjsCore = require("../dist/cjs/index.js");
const cjsReact = require("../dist/cjs/react.js");

for (const entry of [esmCore, cjsCore]) {
  assert.equal(typeof entry.createStyleRuntime, "function");
  assert.equal(typeof entry.compileStyles, "function");
  assert.equal(typeof entry.createStyleCollector, "function");
}

for (const entry of [esmReact, cjsReact]) {
  assert.equal(typeof entry.StyledAtom, "function");
  assert.equal(typeof entry.createStyledAtomStore, "function");
}

const coreBundle = await readFile(new URL("../dist/esm/index.js", import.meta.url), "utf8");
assert.doesNotMatch(coreBundle, /from["']react(?:\/|["'])/);
const reactBundle = await readFile(
  new URL("../dist/esm/react.js", import.meta.url),
  "utf8",
);
assert.match(reactBundle, /^"use client";/);
const coreTypes = await readFile(
  new URL("../dist/esm/index.d.ts", import.meta.url),
  "utf8",
);
assert.doesNotMatch(coreTypes, /resolveHydratedInlineStyle|signature\?: string/);

const runtime = esmCore.createStyleRuntime({
  initialStyles: { card: ".card{color:red}" },
});
const atom = runtime.registerAtom({ files: "card", placement: "inline" });
assert.equal(atom.getSnapshot().status, "ready");
assert.match(atom.getSnapshot().styles[0].css, /color:red/);
atom.dispose();

console.log("Distribution smoke test passed");
