import { test } from "@playwright/test";
import { expect, loadFixture, signIn } from "./support";

test.describe("access", () => {
  test("signed-out visitors are sent to login", async ({ page }) => {
    await page.goto("/today");
    await expect(page).toHaveURL(/\/login\?next=%2Ftoday/);
  });

  test("an unknown worker link is a 404", async ({ page }) => {
    const res = await page.goto("/w/this-token-does-not-exist");
    expect(res?.status()).toBe(404);
  });

  test("wrong password shows an error and stays on login", async ({ page }) => {
    const f = loadFixture();
    await page.goto("/login");
    await page.getByRole("button", { name: /password instead/i }).click();
    await page.getByLabel("Email").fill(f.email);
    await page.getByLabel("Password").fill("definitely-wrong");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page.locator(".bg-dispute-bg")).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test("the owner signs in with a password and lands on Today", async ({ page }) => {
    const f = loadFixture();
    await signIn(page, f);
    await expect(page.getByText("Namaste Asha")).toBeVisible();
    for (const w of Object.values(f.workers)) await expect(page.getByText(w.name, { exact: true }).filter({ visible: true }).first()).toBeVisible();
  });

  test("log out returns to login and protects pages again", async ({ page }) => {
    await signIn(page, loadFixture());
    await page.goto("/settings");
    await page.getByRole("button", { name: "Log out" }).last().click();
    await page.waitForURL("**/login");
    await page.goto("/today");
    await expect(page).toHaveURL(/\/login/);
  });
});
