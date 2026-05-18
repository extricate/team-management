import { test, expect } from "@playwright/test";

test.describe.serial("Bestellingen CRUD", () => {
  let orgId: string;
  const ts = Date.now();
  const atbNummer = `ATB-E2E-${ts}`;
  const omschrijving = `E2E Testbestelling ${ts}`;
  const updatedOmschrijving = `E2E Testbestelling ${ts} Bijgewerkt`;
  let detailUrl: string;

  test("lijst pagina laadt", async ({ page }) => {
    await page.goto("/bestellingen");
    await expect(page).toHaveTitle(/Bestellingen/);
    await expect(page.locator("h1")).toContainText("Bestellingen");
  });

  test("nieuwe bestelling aanmaken", async ({ page }) => {
    const orgResp = await page.request.post("/api/organisations", {
      data: { name: `E2E Bestellingen Org ${ts}`, type: "OS1" },
    });
    expect(orgResp.ok()).toBeTruthy();
    orgId = (await orgResp.json()).data.id;

    await page.goto("/bestellingen/nieuw");
    await page.selectOption("#organisationId", orgId);
    // Select the first non-empty type from the seeded bestelling types
    await page.selectOption("#typeId", { index: 1 });
    await page.fill("#atbNummer", atbNummer);
    await page.fill("#omschrijving", omschrijving);
    await page.click('button[type="submit"]');
    await expect(page.locator("h1")).toContainText(atbNummer, { timeout: 15_000 });
    detailUrl = page.url();
  });

  test("bestelling bewerken", async ({ page }) => {
    await page.goto(detailUrl + "/bewerken");
    await page.fill("#omschrijving", updatedOmschrijving);
    await page.click('button[type="submit"]');
    await expect(page.locator("body")).toContainText(updatedOmschrijving, { timeout: 10_000 });
  });

  test("bestelling archiveren", async ({ page }) => {
    await page.goto(detailUrl);
    await page.click('button:has-text("Archiveren")');
    await page.locator("dialog[open]").waitFor();
    await page.click('dialog[open] button:has-text("Archiveer")');
    await page.waitForURL("/bestellingen", { timeout: 10_000 });
    if (orgId) await page.request.delete(`/api/organisations/${orgId}`);
  });
});
