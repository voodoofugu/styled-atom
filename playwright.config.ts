import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://127.0.0.1:4174",
    trace: "on-first-retry",
  },
  webServer: {
    command: "vite --config e2e/vite.config.ts --host 127.0.0.1",
    url: "http://127.0.0.1:4174/e2e/",
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
