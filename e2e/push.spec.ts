import { test } from "@playwright/test";
import { expect } from "./support";

// Real subscriptions need a browser that can reach the push service, which headless
// browsers cannot; the subscribe flow is verified by hand on a real device instead.
test.describe("push notifications", () => {
  test("the daily cron refuses calls without the secret", async ({ request }) => {
    expect((await request.get("/api/cron/daily?dryRun=1")).status()).toBe(401);
    expect((await request.get("/api/cron/daily?dryRun=1", { headers: { authorization: "Bearer wrong" } })).status()).toBe(401);
  });

  test("the daily cron works out who to remind without sending anything", async ({ request }) => {
    const res = await request.get("/api/cron/daily?dryRun=1", { headers: { authorization: `Bearer ${process.env.CRON_SECRET}` } });
    expect(res.status()).toBe(200);
    expect(await res.json()).toMatchObject({ households: expect.any(Number), notified: expect.any(Number), sent: 0, dryRun: true });
  });
});
