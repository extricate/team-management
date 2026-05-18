import { test, expect } from "@playwright/test";

test.describe.serial("Posities CRUD", () => {
  let orgId: string;
  const ts = Date.now();
  const positionType = `Functionaris E2E ${ts}`;
  const updatedType = `Functionaris E2E ${ts} Bijgewerkt`;
  let detailUrl: string;

  test("lijst pagina laadt", async ({ page }) => {
    await page.goto("/posities");
    await expect(page).toHaveTitle(/Posities/);
    await expect(page.locator("h1")).toContainText("Posities");
  });

  test("nieuwe positie aanmaken", async ({ page }) => {
    const orgResp = await page.request.post("/api/organisations", {
      data: { name: `E2E Posities Org ${ts}`, type: "OS1" },
    });
    expect(orgResp.ok()).toBeTruthy();
    orgId = (await orgResp.json()).data.id;

    await page.goto("/posities/nieuw");
    await page.selectOption("#organisationId", orgId);
    await page.fill("#type", positionType);
    await page.click('button[type="submit"]');
    await expect(page.locator("h1")).toContainText(positionType, { timeout: 15_000 });
    detailUrl = page.url();
  });

  test("positie bewerken", async ({ page }) => {
    await page.goto(detailUrl + "/bewerken");
    await page.fill("#type", updatedType);
    await page.click('button[type="submit"]');
    await expect(page.locator("h1")).toContainText(updatedType, { timeout: 10_000 });
  });

  test("positie archiveren", async ({ page }) => {
    await page.goto(detailUrl);
    await page.click('button:has-text("Archiveren")');
    await page.locator("dialog[open]").waitFor();
    await page.click('dialog[open] button:has-text("Archiveer")');
    await page.waitForURL("/posities", { timeout: 10_000 });
    if (orgId) await page.request.delete(`/api/organisations/${orgId}`);
  });
});
