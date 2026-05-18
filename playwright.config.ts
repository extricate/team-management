import { defineConfig, devices } from "@playwright/test";
import { existsSync } from "fs";

// Load .env.test so E2E_TEST_EMAIL, E2E_TEST_PASSWORD, and DATABASE_URL
// are available to globalSetup without requiring them in the shell environment.
if (existsSync(".env.test")) {
  process.loadEnvFile(".env.test");
}

export default defineConfig({
  globalSetup: "./__tests__/e2e/global.setup.ts",
  testDir: "./__tests__/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",

  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },

  projects: [
    {
      name: "setup",
      testMatch: /.*\.setup\.ts/,
    },
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        storageState: ".playwright/.auth/user.json",
      },
      dependencies: ["setup"],
    },
  ],

  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
