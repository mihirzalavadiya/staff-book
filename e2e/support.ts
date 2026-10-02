import { readFileSync } from "node:fs";
import { expect, type Browser, type Page } from "@playwright/test";
import type { Fixture } from "../tests/fixtures/household";

export const FIXTURE_PATH = "e2e/.fixture.json";

export function loadFixture(): Fixture {
  return JSON.parse(readFileSync(FIXTURE_PATH, "utf8")) as Fixture;
}

/** Signs in as the fixture's household owner and lands on Today. */
export async function signIn(page: Page, f: Fixture) {
  await page.goto("/login");
  await page.getByRole("button", { name: /password instead/i }).click();
  await page.getByLabel("Email").fill(f.email);
  await page.getByLabel("Password").fill(f.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL("**/today");
}

/** The household Today card for one worker (by engagement id). */
export function workerCard(page: Page, engagementId: string) {
  return page.locator(`[data-worker-card="${engagementId}"]`);
}

/** A fresh phone-sized page for the worker's secret link. */
export async function openWorker(browser: Browser, token: string, path = "", lang: "en" | "hi" = "en") {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await ctx.addInitScript((l) => localStorage.setItem("sb.lang", l), lang);
  const page = await ctx.newPage();
  await page.goto(`/w/${token}${path}`);
  return page;
}

/** Waits until the server has persisted `count` rows for that day (UI updates optimistically first). */
export async function waitForRows(engagementId: string, date: string, count: number) {
  const { attendanceRows } = await import("../tests/fixtures/household");
  await expect.poll(async () => (await attendanceRows(engagementId, date)).length, { timeout: 15_000 }).toBe(count);
}

export { expect };
