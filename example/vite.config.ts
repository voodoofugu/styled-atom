import { fileURLToPath, URL } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  plugins: [react()],
  resolve: {
    alias: [
      {
        find: "styled-atom/react",
        replacement: fileURLToPath(new URL("../src/react.tsx", import.meta.url)),
      },
      {
        find: "styled-atom",
        replacement: fileURLToPath(new URL("../src/index.ts", import.meta.url)),
      },
    ],
  },
  server: {
    port: 5173,
  },
});
