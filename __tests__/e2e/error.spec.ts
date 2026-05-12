import { test, expect } from "@playwright/test";

test.describe("500 – Er is een fout opgetreden", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/test-error");
  });

  test("toont de 500-statuscode", async ({ page }) => {
    await expect(page.getByText("500")).toBeVisible();
  });

  test("toont de Nederlandse foutmelding", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: "Er is een fout opgetreden" })
    ).toBeVisible();
  });

  test("toont een knop om opnieuw te proberen", async ({ page }) => {
    await expect(
      page.getByRole("button", { name: "Opnieuw proberen" })
    ).toBeVisible();
  });

  test("toont een link naar het dashboard", async ({ page }) => {
    await expect(
      page.getByRole("link", { name: "Naar dashboard" })
    ).toHaveAttribute("href", "/dashboard");
  });

  test("toont de siteheader en -footer", async ({ page }) => {
    await expect(page.getByRole("banner")).toBeVisible();
    await expect(page.getByRole("contentinfo")).toBeVisible();
  });

  test("herstelt de pagina na klikken op 'Opnieuw proberen'", async ({ page }) => {
    // After clicking reset, Next.js re-renders the segment — it will throw again,
    // but the page must not navigate away (URL stays the same).
    const url = page.url();
    await page.getByRole("button", { name: "Opnieuw proberen" }).click();
    await expect(page).toHaveURL(url);
  });
});
