import { cn } from "@/lib/cn";
import type { AvatarTone } from "@/lib/types";

interface AvatarProps {
  initial: string;
  tone: AvatarTone;
  size?: number;
  /** "squircle" uses the design's 34% radius, "circle" is fully round. */
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

export function Avatar({ initial, tone, size = 50, shape = "squircle", className }: AvatarProps) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: shape === "circle" ? "50%" : Math.round(size * 0.34 * 100) / 100,
        fontSize: Math.round(size * 0.4 * 10) / 10,
      }}
      className={cn(
        "flex flex-none items-center justify-center font-display font-extrabold text-ink",
        TONES[tone],
        className,
      )}
    >
      {initial}
    </div>
  );
}
