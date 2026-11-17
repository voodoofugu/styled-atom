import { mkdir, writeFile } from "node:fs/promises";

await Promise.all([
  mkdir("dist/esm", { recursive: true }),
  mkdir("dist/cjs", { recursive: true }),
]);

await Promise.all([
  writeFile("dist/esm/package.json", '{\n  "type": "module"\n}\n'),
  writeFile("dist/cjs/package.json", '{\n  "type": "commonjs"\n}\n'),
]);

console.log("Wrote ESM and CommonJS package markers");
