import { test } from "@playwright/test";
import postgres from "postgres";
import { attendanceRows } from "../tests/fixtures/household";
import { expect, loadFixture, openWorker, signIn, waitForRows, workerCard } from "./support";

async function reminderCount(engagementId: string): Promise<number> {
  const sql = postgres(process.env.DATABASE_URL!, { max: 1, prepare: false });
  try {
    const [{ n }] = await sql`select count(*)::int as n from reminders where engagement_id = ${engagementId}`;
    return n;
  } finally {
    await sql.end();
  }
}

test.describe("attendance flows between the two sides", () => {
  test("worker claims → household confirms → both see it recorded", async ({ page, browser }) => {
    const f = loadFixture();
    const w = f.workers.claim;

    const phone = await openWorker(browser, w.token);
    await phone.getByRole("button", { name: "I came" }).click();
    await expect(phone.getByText("Sent · waiting for confirmation")).toBeVisible();

    await signIn(page, f);
    const card = workerCard(page, w.engagementId);
    await expect(card.getByText(`${w.name} says he came today`)).toBeVisible();
    await card.getByRole("button", { name: "Yes" }).click();
    await expect(card.getByText(/^Came · /)).toBeVisible();
    await waitForRows(w.engagementId, f.today, 2);

    await phone.reload();
    await expect(phone.getByText("Came · recorded")).toBeVisible();
    expect(await attendanceRows(w.engagementId, f.today)).toEqual([
      { state: "claim", markedBy: "worker" },
      { state: "present", markedBy: "household" },
    ]);
  });

  test("household rejects a claim → it becomes a dispute and can be resolved", async ({ page, browser }) => {
    const f = loadFixture();
    const w = f.workers.reject;

    const phone = await openWorker(browser, w.token);
    await phone.getByRole("button", { name: "I came" }).click();
    await expect(phone.getByText("Sent · waiting for confirmation")).toBeVisible();

    await signIn(page, f);
    await workerCard(page, w.engagementId).getByRole("button", { name: "No" }).click();
    await waitForRows(w.engagementId, f.today, 3);

    await page.goto("/inbox");
    const row = page.locator("div.py-3\\.5").filter({ hasText: w.name });
    await expect(row.getByText("Dispute", { exact: true })).toBeVisible();
    await row.getByRole("button", { name: "Confirm came" }).click();
    await expect(row).toHaveCount(0);

    await expect
      .poll(async () => (await attendanceRows(w.engagementId, f.today)).map((r) => r.state))
      .toEqual(["claim", "leave", "dispute", "present"]);
  });

  test("household marks leave → worker disputes → it shows in Pending", async ({ page, browser }) => {
    const f = loadFixture();
    const w = f.workers.dispute;

    await signIn(page, f);
    await workerCard(page, w.engagementId).getByRole("button", { name: "Leave", exact: true }).click();
    await expect(workerCard(page, w.engagementId).getByText("You marked")).toBeVisible();
    await waitForRows(w.engagementId, f.today, 1);

    const phone = await openWorker(browser, w.token);
    await expect(phone.getByText("Leave recorded")).toBeVisible();
    await phone.getByRole("button", { name: "Is this wrong?" }).click();
    const sheet = phone.getByRole("dialog");
    await sheet.getByRole("button", { name: "I came" }).click();
    await sheet.getByRole("button", { name: "Send" }).click();
    await expect(phone.getByText("Sent. The house will look at it.")).toBeVisible();

    await page.goto("/inbox");
    const row = page.locator("div.py-3\\.5").filter({ hasText: w.name });
    await expect(row.getByText("Dispute", { exact: true })).toBeVisible();
    await expect(row.getByRole("button", { name: "Keep leave" })).toBeVisible();
  });

  test("worker taps Remind → household sees it first in Pending", async ({ page, browser }) => {
    const f = loadFixture();
    const w = f.workers.remind;

    const phone = await openWorker(browser, w.token, "/hisaab");
    await phone.getByRole("button", { name: "Remind them" }).first().click();
    await expect(phone.getByText("Reminded").first()).toBeVisible();
    await expect.poll(() => reminderCount(w.engagementId), { timeout: 15_000 }).toBe(1);
    await phone.reload();
    await expect(phone.getByText("Reminded").first()).toBeVisible();

    await signIn(page, f);
    await page.goto("/inbox");
    const first = page.locator("div.py-3\\.5").first();
    await expect(first).toContainText(`${w.name} reminded you`);
    await expect(first.getByText("Reminder", { exact: true })).toBeVisible();
  });
});
