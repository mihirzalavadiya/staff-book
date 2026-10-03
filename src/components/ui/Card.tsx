import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: "none" | "sm" | "md" | "lg";
}

const PAD = { none: "", sm: "p-3.5", md: "p-4", lg: "p-[18px]" };

/** A quiet ledger panel: ivory surface, hairline border, no shadow. */
export function Card({ padding = "md", className, ...rest }: CardProps) {
  return <div className={cn("rounded-[6px] border border-line bg-surface", PAD[padding], className)} {...rest} />;
}
