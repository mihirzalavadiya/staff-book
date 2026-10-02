import "server-only";

/** Today's date in India, as YYYY-MM-DD. The ledger is day-based, so the timezone must be fixed. */
export function todayIST(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
}
