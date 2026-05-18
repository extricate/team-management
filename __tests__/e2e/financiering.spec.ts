import { test, expect } from "@playwright/test";

test.describe.serial("Financiering CRUD", () => {
  let orgId: string;
  const ts = Date.now();
  const projectId = `E2E-${ts}`;
  const name = `E2E Financieringsbron ${ts}`;
  const updatedName = `E2E Financieringsbron ${ts} Bijgewerkt`;
  let detailUrl: string;

  test("lijst pagina laadt", async ({ page }) => {
    await page.goto("/financiering");
    await expect(page).toHaveTitle(/Financiering/);
    await expect(page.locator("h1")).toContainText("Financiering");
  });

  test("nieuwe financieringsbron aanmaken", async ({ page }) => {
    const orgResp = await page.request.post("/api/organisations", {
      data: { name: `E2E Financiering Org ${ts}`, type: "OS1" },
    });
    expect(orgResp.ok()).toBeTruthy();
    orgId = (await orgResp.json()).data.id;

    await page.goto("/financiering/nieuw");
    await page.selectOption("#organisationId", orgId);
    await page.fill("#projectId", projectId);
    await page.fill("#name", name);
    await page.click('button[type="submit"]');
    await expect(page.locator("h1")).toContainText(name, { timeout: 15_000 });
    detailUrl = page.url();
  });

  test("financieringsbron bewerken", async ({ page }) => {
    await page.goto(detailUrl + "/bewerken");
    await page.fill("#name", updatedName);
    await page.click('button[type="submit"]');
    await expect(page.locator("h1")).toContainText(updatedName, { timeout: 10_000 });
  });

  test("financieringsbron archiveren", async ({ page }) => {
    await page.goto(detailUrl);
    await page.click('button:has-text("Archiveren")');
    await page.locator("dialog[open]").waitFor();
    await page.click('dialog[open] button:has-text("Archiveer")');
    await page.waitForURL("/financiering", { timeout: 10_000 });
    if (orgId) await page.request.delete(`/api/organisations/${orgId}`);
  });
});
