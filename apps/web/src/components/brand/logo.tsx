import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span aria-hidden="true" className="barber-pole size-8 rounded-lg border border-line" />
      <span className="text-xl font-bold tracking-tight text-ink">
        Barber<span className="text-pole">OS</span>
      </span>
    </span>
  );
}
