import { test } from "@playwright/test";
import postgres from "postgres";
import { OLDER_GAP_DAY, previousMonth } from "../tests/fixtures/household";
import { expect, loadFixture, openWorker, signIn, waitForRows, workerCard } from "./support";

async function settledAmount(engagementId: string): Promise<number | null> {
  const sql = postgres(process.env.DATABASE_URL!, { max: 1, prepare: false });
  try {
    const rows = await sql`select amount_due from settlements where engagement_id = ${engagementId}`;
    return rows[0]?.amount_due ?? null;
  } finally {
    await sql.end();
  }
}

test("month is blocked until every day is filled, then finalised on both sides", async ({ page, browser }) => {
  const f = loadFixture();
  const w = f.workers.settle;
  const amount = `₹${w.salary.toLocaleString("en-IN")}`;

  await signIn(page, f);
  await page.goto(`/hisaab?worker=${w.engagementId}`);
  await expect(page.getByText("1 day pending").first()).toBeVisible();
  await expect(page.getByRole("button", { name: /Finalise/ })).toBeDisabled();

  await page.goto("/today");
  await workerCard(page, w.engagementId).getByRole("button", { name: "Came", exact: true }).click();
  await expect(workerCard(page, w.engagementId).getByText("You marked")).toBeVisible();
  await waitForRows(w.engagementId, f.today, 1);

  await page.goto(`/hisaab?worker=${w.engagementId}`);
  await expect(page.getByText("Every day is filled in")).toBeVisible();
  const finalise = page.getByRole("button", { name: `Finalise · ${amount}` });
  await expect(finalise).toBeEnabled();
  await finalise.click();
  await expect.poll(() => settledAmount(w.engagementId), { timeout: 20_000 }).toBe(w.salary);

  await page.reload();
  await expect(page.getByText(`Finalised · ${amount}`)).toBeVisible();
  await page.getByRole("button", { name: "Mark as paid" }).click();
  await expect(page.getByText(/^Paid on /)).toBeVisible();

  const phone = await openWorker(browser, w.token, "/hisaab");
  await expect(phone.getByText(amount).first()).toBeVisible();
  await expect(phone.getByText("Final", { exact: true })).toBeVisible();
});

test("a day older than 7 days can still be fixed from the settlement screen", async ({ page }) => {
  const f = loadFixture();
  const w = f.workers.older;
  const prev = previousMonth(f.today);
  const gap = `${prev}-${String(OLDER_GAP_DAY).padStart(2, "0")}`;

  await signIn(page, f);
  await page.goto(`/hisaab?worker=${w.engagementId}&month=${prev}`);
  await expect(page.getByText("1 day pending").first()).toBeVisible();
  await expect(page.getByRole("button", { name: /Finalise/ })).toBeDisabled();

  await page.getByRole("button", { name: "Came", exact: true }).click();
  await waitForRows(w.engagementId, gap, 1);
  await page.reload();
  await expect(page.getByText("Every day is filled in")).toBeVisible();
  await expect(page.getByRole("button", { name: /Finalise/ })).toBeEnabled();
});
