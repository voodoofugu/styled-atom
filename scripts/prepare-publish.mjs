import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const publishDir = path.join(root, "publish");
const publishDist = path.join(publishDir, "dist");
const publishTypes = path.join(publishDist, "types");

const rootPackage = JSON.parse(
  await readFile(path.join(root, "package.json"), "utf8"),
);

const publishExports = {
  ...rootPackage.exports,
  ".": {
    ...rootPackage.exports["."],
    types: "./dist/types/index.d.ts",
  },
};

const publishPackage = {
  name: rootPackage.name,
  version: rootPackage.version,
  description: rootPackage.description,
  author: rootPackage.author,
  license: rootPackage.license,
  type: rootPackage.type,
  main: rootPackage.main,
  module: rootPackage.module,
  types: "dist/types/index.d.ts",
  exports: publishExports,
  repository: rootPackage.repository,
  homepage: rootPackage.homepage,
  keywords: rootPackage.keywords,
  sideEffects: false,
  files: ["dist", "README.md", "LICENSE"],
};

await rm(publishDir, { recursive: true, force: true });
await mkdir(publishDir, { recursive: true });

await cp(path.join(root, "dist"), publishDist, { recursive: true });

await rm(path.join(publishDist, "cjs", "types"), {
  recursive: true,
  force: true,
});
await rm(path.join(publishDist, "esm", "types"), {
  recursive: true,
  force: true,
});
await cp(path.join(root, "dist", "types"), publishTypes, {
  recursive: true,
});

await cp(path.join(root, "README.md"), path.join(publishDir, "README.md"));
await cp(path.join(root, "LICENSE"), path.join(publishDir, "LICENSE"));

await writeFile(
  path.join(publishDir, "package.json"),
  `${JSON.stringify(publishPackage, null, 2)}\n`,
);

console.log(`Prepared publish package: ${publishDir}`);
