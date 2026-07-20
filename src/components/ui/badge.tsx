import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

type Tone = "neutral" | "success" | "warning" | "danger" | "info" | "accent";

const tones: Record<Tone, string> = {
  neutral: "bg-surface-page text-ink-soft border-surface-line",
  success: "bg-state-success-bg text-state-success border-transparent",
  warning: "bg-state-warning-bg text-state-warning border-transparent",
  danger: "bg-state-danger-bg text-state-danger border-transparent",
  info: "bg-state-info-bg text-state-info border-transparent",
  accent: "bg-brand-accent/20 text-brand border-transparent",
};

export function Badge({
  tone = "neutral",
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        tones[tone],
        className
      )}
      {...props}
    />
  );
}
