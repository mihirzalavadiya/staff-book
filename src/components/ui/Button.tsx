import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { Icon } from "./Icon";
import { Spinner, WalkLoader } from "./Spinner";
import type { Phase } from "@/lib/phase";

type Variant = "primary" | "soft" | "outline" | "danger" | "ghost";
type Size = "sm" | "md" | "lg" | "xl";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  block?: boolean;
  /** Shows the spinner and `loadingText` in place of the label, and disables the button. */
  loading?: boolean;
  loadingText?: string;
  /** Briefly true after the server said OK: shows a tick that pops in. */
  success?: boolean;
  /** Full save lifecycle; takes precedence over `loading` / `success`. */
  phase?: Phase;
  /** "walk" = the login page's walker-and-goal loader; everything else uses a simple ring. */
  loader?: "ring" | "walk";
}

const VARIANT: Record<Variant, string> = {
  primary: "bg-ink text-bg",
  soft: "bg-surface-2 text-ink",
  outline: "bg-transparent text-ink border border-ink",
  danger: "bg-transparent text-dispute-fg border border-dispute-fg",
  ghost: "bg-transparent text-muted",
};

const SIZE: Record<Size, string> = {
  sm: "h-[34px] rounded-[3px] px-3 text-[13px] gap-1.5",
  md: "h-[46px] rounded-[3px] px-4 text-sm gap-2",
  lg: "h-[50px] rounded-[3px] px-4 text-sm gap-2",
  xl: "h-14 rounded-[3px] px-5 text-[15px] gap-2 tracking-[0.04em]",
};

export function Button({
  variant = "primary",
  size = "md",
  block,
  loading,
  loadingText,
  success,
  phase: phaseProp,
  loader = "ring",
  className,
  type = "button",
  disabled,
  children,
  ...rest
}: ButtonProps) {
  const phase: Phase = phaseProp ?? (loading ? "running" : success ? "done" : "idle");
  const busy = phase === "running" || phase === "finishing" || phase === "failed";
  return (
    <button
      type={type}
      disabled={disabled || phase !== "idle"}
      aria-busy={busy || undefined}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap font-semibold tracking-[0.02em] transition-[opacity,transform] disabled:cursor-not-allowed",
        busy && loader === "walk" ? "sb-busy relative overflow-hidden cursor-progress" : busy ? "cursor-progress" : phase === "done" ? "" : "disabled:opacity-40",
        VARIANT[variant],
        SIZE[size],
        block && "w-full",
        className,
      )}
      {...rest}
    >
      {busy ? (
        loader === "ring" || size === "sm" ? (
          <>
            <Spinner size={size === "sm" ? 14 : 18} />
            <span>{loadingText ?? children}</span>
          </>
        ) : (
          <WalkLoader label={String(loadingText ?? "")} phase={phase} walker={size === "md" ? 16 : 20} />
        )
      ) : phase === "done" ? (
        <span className="sb-pop inline-flex items-center gap-2">
          <Icon name="check" size={18} strokeWidth={3.2} />
          {children}
        </span>
      ) : (
        children
      )}
    </button>
  );
}
