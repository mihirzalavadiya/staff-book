/**
 * A save's life on screen:
 *   running   – sent, waiting for the server (the walker heads toward the goal)
 *   finishing – server said OK, the walker sprints and scores
 *   done      – tick shown
 *   failed    – server refused or no network: the shot misses, the walker stops
 *   idle      – nothing happening
 */
export type Phase = "idle" | "running" | "finishing" | "done" | "failed";

/** How long the sprint-and-score and the tick stay on screen after the server says OK. */
export const FINISH_MS = 420;
const DONE_MS = 450;
const FAIL_MS = 900;
/** Give up waiting after this long; the screen then reloads from the server to show the truth. */
const TIMEOUT_MS = 20_000;
/** After this long the loader switches to its "still working" look. */
export const SLOW_MS = 4_000;

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * Runs `task` and reports its phase: running until it resolves, then idle.
 * With `ceremony` (the login page's walker), success plays finishing → done
 * and failure plays failed before going idle. Returns whether it succeeded.
 */
export async function withPhases(
  task: () => Promise<boolean>,
  onPhase: (p: Phase) => void,
  { ceremony = false }: { ceremony?: boolean } = {},
): Promise<boolean> {
  onPhase("running");
  let ok = false;
  try {
    ok = await Promise.race([task(), sleep(TIMEOUT_MS).then(() => false)]);
  } catch {
    ok = false;
  }
  if (!ok) {
    if (ceremony) {
      onPhase("failed");
      await sleep(FAIL_MS);
    }
    onPhase("idle");
    return false;
  }
  if (!ceremony) {
    onPhase("idle");
    return true;
  }
  onPhase("finishing");
  await sleep(FINISH_MS);
  onPhase("done");
  await sleep(DONE_MS);
  onPhase("idle");
  return true;
}
