import { test, expect } from "@playwright/test";

test.describe.serial("Organisaties CRUD", () => {
  const ts = Date.now();
  const name = `E2E Organisatie ${ts}`;
  const updatedName = `E2E Organisatie ${ts} Bijgewerkt`;
  let detailUrl: string;

  test("lijst pagina laadt", async ({ page }) => {
    await page.goto("/organisaties");
    await expect(page).toHaveTitle(/Organisaties/);
    await expect(page.locator("h1")).toContainText("Organisaties");
  });

  test("nieuwe organisatie aanmaken", async ({ page }) => {
    await page.goto("/organisaties/nieuw");
    await page.fill("#name", name);
    await page.selectOption("#type", "OS1");
    await page.click('button[type="submit"]');
    // Wait for h1 to show the created entity — only true after redirect to detail page
    await expect(page.locator("h1")).toContainText(name, { timeout: 15_000 });
    detailUrl = page.url();
  });

  test("organisatie bewerken", async ({ page }) => {
    await page.goto(detailUrl);
    await page.click('a:has-text("Bewerken")');
    await page.waitForURL(/\/organisaties\/.+\/bewerken/, { timeout: 10_000 });
    await page.fill("#name", updatedName);
    await page.click('button[type="submit"]');
    await expect(page.locator("h1")).toContainText(updatedName, { timeout: 10_000 });
  });

  test("organisatie archiveren", async ({ page }) => {
    await page.goto(detailUrl);
    await page.click('button:has-text("Archiveren")');
    await page.locator("dialog[open]").waitFor();
    await page.click('dialog[open] button:has-text("Archiveer")');
    await page.waitForURL("/organisaties", { timeout: 10_000 });
  });
});
