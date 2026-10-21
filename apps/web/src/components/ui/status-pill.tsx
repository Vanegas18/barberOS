import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const TONES = {
  neutral: "border border-control bg-surface text-ink",
  pending: "border-[1.5px] border-dashed border-pending-line bg-brand-soft text-brand-ink",
  danger: "bg-danger-soft text-danger",
  live: "bg-ink text-brand",
  free: "bg-brand text-ink",
  done: "bg-sunken text-ink-muted",
} as const;

export type PillTone = keyof typeof TONES;

export function StatusPill({
  tone = "neutral",
  className,
  children,
}: {
  tone?: PillTone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-[26px] flex-none items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold whitespace-nowrap",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
