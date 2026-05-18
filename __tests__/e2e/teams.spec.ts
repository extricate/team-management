import { test, expect } from "@playwright/test";

test.describe.serial("Teams CRUD", () => {
  let orgId: string;
  const ts = Date.now();
  const name = `E2E Team ${ts}`;
  const updatedName = `E2E Team ${ts} Bijgewerkt`;
  let detailUrl: string;

  test("lijst pagina laadt", async ({ page }) => {
    await page.goto("/teams");
    await expect(page).toHaveTitle(/Teams/);
    await expect(page.locator("h1")).toContainText("Teams");
  });

  test("nieuw team aanmaken", async ({ page }) => {
    const orgResp = await page.request.post("/api/organisations", {
      data: { name: `E2E Teams Org ${ts}`, type: "OS1" },
    });
    expect(orgResp.ok()).toBeTruthy();
    orgId = (await orgResp.json()).data.id;

    await page.goto("/teams/nieuw");
    await page.selectOption("#organisationId", orgId);
    await page.fill("#name", name);
    await page.click('button[type="submit"]');
    await expect(page.locator("h1")).toContainText(name, { timeout: 15_000 });
    detailUrl = page.url();
  });

  test("team bewerken", async ({ page }) => {
    await page.goto(detailUrl + "/bewerken");
    await page.fill("#name", updatedName);
    await page.click('button[type="submit"]');
    await expect(page.locator("h1")).toContainText(updatedName, { timeout: 10_000 });
  });

  test("team archiveren", async ({ page }) => {
    await page.goto(detailUrl);
    await page.click('button:has-text("Archiveren")');
    await page.locator("dialog[open]").waitFor();
    await page.click('dialog[open] button:has-text("Archiveer")');
    await page.waitForURL("/teams", { timeout: 10_000 });
    if (orgId) await page.request.delete(`/api/organisations/${orgId}`);
  });
});
