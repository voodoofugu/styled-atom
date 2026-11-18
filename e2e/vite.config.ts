import { fileURLToPath, URL } from "node:url";

import { defineConfig, type Plugin } from "vite";

const externalStylesheetFixture = (): Plugin => ({
  name: "external-stylesheet-fixture",
  configureServer(server) {
    server.middlewares.use((request, response, next) => {
      const url = new URL(request.url ?? "/", "http://127.0.0.1");
      if (url.pathname !== "/e2e/link-asset.css") {
        next();
        return;
      }
      const version = url.searchParams.get("version");
      if (version !== "red" && version !== "blue") {
        response.statusCode = 404;
        response.end("Not found");
        return;
      }
      const rules = Math.min(
        2_000,
        Math.max(0, Number(url.searchParams.get("rules")) || 0),
      );
      const delay = Math.min(
        1_000,
        Math.max(0, Number(url.searchParams.get("delay")) || 0),
      );
      const color = version === "red" ? "rgb(180, 32, 48)" : "rgb(16, 112, 96)";
      const css = [
        `.link-probe{color:${color};--link-version:${version}}`,
        ...Array.from(
          { length: rules },
          (_, index) => `.link-rule-${index}{--link-rule:${index}}`,
        ),
      ].join("\n");
      const send = () => {
        response.statusCode = 200;
        response.setHeader("Content-Type", "text/css; charset=utf-8");
        response.setHeader("Timing-Allow-Origin", "*");
        response.setHeader(
          "Cache-Control",
          url.searchParams.get("cache") === "1"
            ? "public, max-age=31536000, immutable"
            : "no-store",
        );
        response.end(css);
      };
      if (delay > 0) setTimeout(send, delay);
      else send();
    });
  },
});

export default defineConfig({
  root: fileURLToPath(new URL("..", import.meta.url)),
  plugins: [externalStylesheetFixture()],
  server: {
    port: 4174,
    strictPort: true,
  },
});
