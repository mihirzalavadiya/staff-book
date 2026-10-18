/** Uniform result for server actions so the client never has to catch. */
export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

export const ok = <T = undefined>(data?: T): ActionResult<T> => ({ ok: true, data: data as T });
/** Error returned when a rate limit refuses the call; the UI turns it into "wait a minute". */
export const RATE_LIMITED = "rate_limited";

export const fail = (error: string): ActionResult<never> => ({ ok: false, error });
