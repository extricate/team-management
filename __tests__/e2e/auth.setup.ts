import { test as setup, expect } from "@playwright/test";
import path from "path";
import fs from "fs";

// Credentials are seeded by global.setup.ts before this runs.
const authFile = path.join(process.cwd(), ".playwright/.auth/user.json");
const email = process.env.E2E_TEST_EMAIL ?? "admin@example.com";
const password = process.env.E2E_TEST_PASSWORD!;

setup("authenticate", async ({ page }) => {
  fs.mkdirSync(path.dirname(authFile), { recursive: true });

  await page.goto("/inloggen");
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.click('button[type="submit"]');

  await page.waitForURL((url) => !url.pathname.includes("/inloggen"), {
    timeout: 15_000,
  });

  await expect(page).not.toHaveURL(/inloggen/);
  await page.context().storageState({ path: authFile });
});
