import { test } from "@playwright/test";
import { addDays, dayOfMonth } from "../src/lib/date";
import { attendanceRows } from "../tests/fixtures/household";
import { expect, loadFixture } from "./support";

test.describe("worker screens on a phone", () => {
  test("colour toggle switches theme", async ({ page }) => {
    const f = loadFixture();
    await page.goto(`/w/${f.workers.hindi.token}`);
    const theme = () => page.evaluate(() => document.documentElement.dataset.theme ?? "light");
    const before = await theme();
    await page.getByRole("button", { name: "Colour" }).click();
    await expect.poll(theme).not.toBe(before);
  });

  test("language picker switches to Hindi with the right gender", async ({ page }) => {
    const f = loadFixture();
    await page.goto(`/w/${f.workers.hindi.token}`);
    await page.getByRole("link", { name: "Language" }).click();
    await page.getByRole("button", { name: "हिन्दी" }).click();
    await page.waitForURL(`**/w/${f.workers.hindi.token}`);
    await expect(page.getByText("नमस्ते Suresh")).toBeVisible();
    await expect(page.getByRole("button", { name: "आ गया" })).toBeVisible(); // male: आ गया, not आ गई
    await page.getByRole("link", { name: "भाषा" }).click();
    await page.getByRole("button", { name: "English" }).click();
    await expect(page.getByText("Namaste Suresh")).toBeVisible();
  });

  test("plan leave for tomorrow is saved as final leave", async ({ page }) => {
    const f = loadFixture();
    const w = f.workers.remind;
    const tomorrow = addDays(f.today, 1);
    await page.goto(`/w/${w.token}/leave`);
    await page.locator("button:not([disabled])", { hasText: new RegExp(`^${dayOfMonth(tomorrow)}$`) }).first().click();
    await page.getByRole("button", { name: "Not well" }).click();
    await page.getByRole("button", { name: /Done/ }).click();
    await expect(page.getByText("Leave noted. The house has been told.")).toBeVisible();
    await expect.poll(() => attendanceRows(w.engagementId, tomorrow)).toEqual([{ state: "leave", markedBy: "worker" }]);
  });

  test("no horizontal scrolling on the worker screens", async ({ page }) => {
    const f = loadFixture();
    for (const path of ["", "/hisaab", "/leave", "/language"]) {
      await page.goto(`/w/${f.workers.hindi.token}${path}`);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, path || "/").toBeLessThanOrEqual(0);
    }
  });
});
