import { test } from "@playwright/test";
import { expect, loadFixture, signIn, workerCard } from "./support";

test("household screens are fully Hindi, with gendered verbs", async ({ page }) => {
  const f = loadFixture();
  await page.addInitScript(() => localStorage.setItem("sb.lang", "hi"));
  await page.goto("/login");
  await page.getByRole("button", { name: /पासवर्ड से/ }).click();
  await page.getByLabel("ईमेल").fill(f.email);
  await page.getByLabel("पासवर्ड").fill(f.password);
  await page.getByRole("button", { name: "लॉगिन", exact: true }).click();
  await page.waitForURL("**/today");

  await expect(workerCard(page, f.workers.hindi.engagementId).getByRole("button", { name: "आया", exact: true })).toBeVisible();
  await expect(page.getByRole("navigation").getByRole("link", { name: /बाकी काम/ })).toBeVisible();

  // Only names and brand words may stay in Latin script.
  // Compared case-insensitively: small uppercase labels render names as "GOPAL".
  const allowed = new Set(
    ["Staffbook", "Asha", "E2E", "Home", "WhatsApp", "am", "pm", ...Object.values(f.workers).map((w) => w.name)].map((w) => w.toLowerCase()),
  );
  for (const path of ["/today", "/inbox", "/hisaab", "/calendar", "/workers", "/settings"]) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    // The test household's name has a random suffix; it is user data, not UI text.
    const text = (await page.evaluate(() => document.body.innerText)).replaceAll(/E2E Home \w+/gi, "");
    const latin = [...new Set(text.match(/[A-Za-z]{3,}/g) ?? [])].filter((w) => !allowed.has(w.toLowerCase()) && !/^[0-9a-f]{8}$/.test(w));
    expect(latin, `English left on ${path}`).toEqual(["English"].filter((x) => latin.includes(x)));
  }
});

test("Sign in still works when signed in already (no redirect loop)", async ({ page }) => {
  await signIn(page, loadFixture());
  await page.goto("/login");
  await expect(page).toHaveURL(/\/today/);
});
