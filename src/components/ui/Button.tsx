import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "soft" | "outline" | "danger" | "success" | "ghost" | "white";
type Size = "sm" | "md" | "lg" | "xl" | "hero";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  block?: boolean;
}

const VARIANT: Record<Variant, string> = {
  primary: "bg-coral text-white",
  soft: "bg-coral-soft text-ink",
  outline: "bg-surface text-ink border-2 border-ink",
  danger: "bg-dispute-bg text-dispute-fg",
  success: "bg-present-cell text-present-fg",
  ghost: "bg-transparent text-muted",
  white: "bg-surface text-ink",
};

const SIZE: Record<Size, string> = {
  sm: "h-[34px] rounded-[17px] px-3 text-xs gap-1",
  md: "h-11 rounded-2xl px-4 text-[15px] gap-2",
  lg: "h-[50px] rounded-2xl px-4 text-[15px] gap-2",
  xl: "h-[58px] rounded-[20px] px-5 text-base gap-2",
  hero: "h-[66px] rounded-[22px] px-5 text-lg gap-2",
};

export function Button({
  variant = "primary",
  size = "md",
  block,
  className,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap font-bold transition-[opacity,transform] disabled:cursor-not-allowed disabled:opacity-40",
        VARIANT[variant],
        SIZE[size],
        block && "w-full",
        className,
      )}
      {...rest}
    />
  );
}
