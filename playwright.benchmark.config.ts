import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  testMatch: "benchmark.spec.ts",
  fullyParallel: false,
  workers: 1,
  reporter: "line",
  use: {
    ...devices["Desktop Chrome"],
    baseURL: "http://127.0.0.1:4174",
  },
  webServer: {
    command: "vite --config e2e/vite.config.ts --host 127.0.0.1",
    url: "http://127.0.0.1:4174/e2e/",
    reuseExistingServer: true,
    timeout: 30_000,
  },
});
