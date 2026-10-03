import { cn } from "@/lib/cn";
import type { AvatarTone } from "@/lib/types";

interface AvatarProps {
  initial: string;
  tone: AvatarTone;
  size?: number;
  /** Kept for call sites; every avatar is round in the editorial style. */
  shape?: "squircle" | "circle";
  className?: string;
}

const TONES: Record<AvatarTone, string> = {
  purple: "bg-av-purple",
  blue: "bg-av-blue",
  green: "bg-av-green",
  yellow: "bg-av-yellow",
  peach: "bg-av-peach",
};

export function Avatar({ initial, tone, size = 50, className }: AvatarProps) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        fontSize: Math.round(size * 0.48 * 10) / 10,
      }}
      className={cn(
        "flex flex-none items-center justify-center font-display leading-none text-ink",
        TONES[tone],
        className,
      )}
    >
      {initial}
    </div>
  );
}
