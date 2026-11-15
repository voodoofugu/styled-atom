import { fileURLToPath, URL } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const fromSite = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  root: fromSite("."),
  plugins: [react()],
  resolve: {
    alias: [
      {
        find: "styled-atom/react",
        replacement: fromSite("../src/react.tsx"),
      },
      {
        find: "styled-atom",
        replacement: fromSite("../src/index.ts"),
      },
    ],
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
