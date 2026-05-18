import { test, expect } from "@playwright/test";

test.describe.serial("Medewerkers CRUD", () => {
  let orgId: string;
  const ts = Date.now();
  const firstName = "E2E";
  const lastName = `Medewerker ${ts}`;
  const updatedLastName = `Medewerker ${ts} Bijgewerkt`;
  let detailUrl: string;

  test("lijst pagina laadt", async ({ page }) => {
    await page.goto("/medewerkers");
    await expect(page).toHaveTitle(/Medewerkers/);
    await expect(page.locator("h1")).toContainText("Medewerkers");
  });

  test("nieuwe medewerker aanmaken", async ({ page }) => {
    const orgResp = await page.request.post("/api/organisations", {
      data: { name: `E2E Medewerkers Org ${ts}`, type: "OS1" },
    });
    expect(orgResp.ok()).toBeTruthy();
    orgId = (await orgResp.json()).data.id;

    await page.goto("/medewerkers/nieuw");
    await page.selectOption("#organisationId", orgId);
    await page.fill("#firstName", firstName);
    await page.fill("#lastName", lastName);
    await page.click('button[type="submit"]');
    await expect(page.locator("h1")).toContainText(lastName, { timeout: 15_000 });
    detailUrl = page.url();
  });

  test("medewerker bewerken", async ({ page }) => {
    await page.goto(detailUrl + "/bewerken");
    await page.fill("#lastName", updatedLastName);
    await page.click('button[type="submit"]');
    await expect(page.locator("h1")).toContainText(updatedLastName, { timeout: 10_000 });
  });

  test("medewerker archiveren", async ({ page }) => {
    await page.goto(detailUrl);
    await page.click('button:has-text("Archiveren")');
    await page.locator("dialog[open]").waitFor();
    await page.click('dialog[open] button:has-text("Archiveer")');
    await page.waitForURL("/medewerkers", { timeout: 10_000 });
    if (orgId) await page.request.delete(`/api/organisations/${orgId}`);
  });
});
