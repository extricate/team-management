import { test, expect } from "@playwright/test";

test.describe("404 – Pagina niet gevonden", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/deze-pagina-bestaat-echt-niet");
  });

  test("toont de 404-statuscode", async ({ page }) => {
    await expect(page.getByText("404")).toBeVisible();
  });

  test("toont de Nederlandse foutmelding", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: "Pagina niet gevonden" })
    ).toBeVisible();
  });

  test("toont een link naar het dashboard", async ({ page }) => {
    await expect(
      page.getByRole("link", { name: "Naar dashboard" })
    ).toHaveAttribute("href", "/dashboard");
  });

  test("toont een link naar de startpagina", async ({ page }) => {
    await expect(
      page.getByRole("link", { name: "Naar startpagina" })
    ).toHaveAttribute("href", "/");
  });

  test("toont de siteheader en -footer", async ({ page }) => {
    await expect(page.getByRole("banner")).toBeVisible();
    await expect(page.getByRole("contentinfo")).toBeVisible();
  });
});
