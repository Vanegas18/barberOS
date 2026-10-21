import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex size-9 shrink-0 items-center justify-center rounded-[11px] bg-ink text-brand",
        className,
      )}
    >
      <svg
        viewBox="0 0 24 24"
        className="size-[58%]"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M8 3h7a2 2 0 0 1 2 2v6H8z" />
        <path d="M5 11h14v3a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1z" />
        <path d="M12 15v4" />
        <path d="M8 21h8" />
      </svg>
    </span>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <BrandMark />
      <span className="text-lg font-bold tracking-tight text-ink">BarberOS</span>
    </span>
  );
}
