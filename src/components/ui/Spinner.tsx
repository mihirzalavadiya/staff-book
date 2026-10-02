"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import type { Phase } from "@/lib/phase";
import { FINISH_MS, SLOW_MS } from "@/lib/phase";
import { useI18n } from "@/lib/i18n";

/** A little person mid-stride: legs and arms swing, the body bobs. Inherits text colour. */
export function Walker({ size = 18, fast, stopped, className }: { size?: number; fast?: boolean; stopped?: boolean; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={cn("sb-walker flex-none overflow-visible", fast && "sb-walker-fast", stopped && "sb-walker-stopped", className)}
    >
      <g fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <g className="sb-walker-body">
          <circle cx="12" cy="4.2" r="2.4" fill="currentColor" stroke="none" />
          <path d="M12 7.4v6.4" />
          <path className="sb-arm-a" d="M12 8.8l-3.4 3.6" />
          <path className="sb-arm-b" d="M12 8.8l3.4 3.6" />
        </g>
        <path className="sb-leg-a" d="M12 13.8l-3 6.6" />
        <path className="sb-leg-b" d="M12 13.8l3 6.6" />
      </g>
    </svg>
  );
}

/** The everyday loader: a quiet ring. Pair it with text. */
export function Spinner({ size = 18, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className={cn("flex-none animate-spin", className)}>
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function Ball({ size, spin }: { size: number; spin: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" style={{ transform: `rotate(${spin}deg)` }}>
      <circle cx="12" cy="12" r="10.5" fill="currentColor" />
      <path d="M12 6.8l4.2 3-1.6 5h-5.2l-1.6-5z" fill="var(--sb-ball-patch, rgba(0,0,0,0.28))" />
      <path d="M12 6.8V2M16.2 9.8l4.4-1.5M14.6 14.8l2.8 3.9M9.4 14.8l-2.8 3.9M7.8 9.8L3.4 8.3" stroke="var(--sb-ball-patch, rgba(0,0,0,0.28))" strokeWidth="1.4" />
    </svg>
  );
}

/** How far along the walk is: eases toward 85% while waiting, sprints to 100% on success. */
function useProgress(phase: Phase): number {
  const [p, setP] = useState(0);
  const from = useRef(0);
  const started = useRef<number | null>(null);

  useEffect(() => {
    let raf = 0;
    const t0 = performance.now();
    started.current ??= t0;
    const base = from.current;
    const tick = (now: number) => {
      let next: number;
      if (phase === "failed") {
        next = base; // the walker stops where they are
      } else if (phase === "finishing" || phase === "done") {
        const k = Math.min(1, (now - t0) / FINISH_MS);
        next = base + (1 - base) * (1 - (1 - k) ** 3);
      } else {
        const elapsed = now - (started.current ?? t0);
        // Quick start, then a slow creep that never quite stops: 60% in ~1s, 85% in ~4s, 95% after ~15s.
        next = 0.95 * (1 - Math.exp(-elapsed / 1600));
      }
      from.current = next;
      setP(next);
      if (next < 0.9999 || phase === "running") raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  return p;
}

/** True once the current run has waited longer than SLOW_MS. */
function useSlow(phase: Phase): boolean {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    if (phase !== "running") return;
    const id = window.setTimeout(() => setSlow(true), SLOW_MS);
    return () => {
      window.clearTimeout(id);
      setSlow(false);
    };
  }, [phase]);
  return slow && phase === "running";
}

/**
 * Button-filling loader. A little person walks once from left to right along
 * the bottom of the button, dribbling a ball toward a goal at the end. While
 * the server is thinking they slow down short of the goal; when it answers OK
 * they sprint, the ball goes in, and the button shows a tick.
 */
export function WalkLoader({ label, phase, walker = 16 }: { label: string; phase: Phase; walker?: number }) {
  const { t } = useI18n();
  const p = useProgress(phase);
  const missed = phase === "failed";
  const slow = useSlow(phase);
  const ball = Math.round(walker * 0.62);
  const goal = Math.round(walker * 0.9);
  const run = walker + ball + goal; // px the moving pair and goal take up
  const x = `calc(${p.toFixed(4)} * (100% - ${run}px))`;
  const scored = phase === "finishing" && p > 0.985;

  return (
    <>
      <span className="relative z-[1]" style={{ transform: `translateY(-${Math.round(walker * 0.38)}px)` }}>
        {missed ? `✕ ${t("common.notSaved")}` : slow ? t("common.stillSaving") : label}
      </span>
      <span aria-hidden="true" className="pointer-events-none absolute inset-x-4 bottom-[5px] block" style={{ height: walker }}>
        <span className="sb-walk-path" />
        <span className="sb-walk-trail" style={{ width: `calc(${x} + ${walker / 2}px)` }} />
        <span className="absolute bottom-[1px]" style={{ left: x }}>
          <Walker size={walker} fast={phase === "finishing"} stopped={missed} />
        </span>
        <span
          className={cn("absolute bottom-[1px]", missed && "sb-ball-miss", slow && "sb-ball-juggle")}
          style={{ left: missed ? `calc(100% - ${goal + ball / 2}px)` : `calc(${x} + ${walker - 2}px)` }}
        >
          <Ball size={ball} spin={p * 900} />
        </span>
        <span className={cn("sb-goal absolute right-0 bottom-0", scored && "sb-goal-scored")} style={{ width: goal, height: Math.round(walker * 0.8) }} />
      </span>
    </>
  );
}
