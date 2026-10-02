import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: "none" | "sm" | "md" | "lg";
  radius?: 22 | 26 | 28;
}

const PAD = { none: "", sm: "p-3.5", md: "p-4", lg: "p-[18px]" };

/** White surface with the coral-tinted shadow from the design. */
export function Card({ padding = "md", radius = 26, className, ...rest }: CardProps) {
  return (
    <div
      className={cn("bg-surface shadow-card", PAD[padding], className)}
      style={{ borderRadius: radius }}
      {...rest}
    />
  );
}
