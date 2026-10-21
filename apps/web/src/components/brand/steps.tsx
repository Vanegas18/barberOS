import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = ["Tu cuenta", "Tu negocio"] as const;

export function OnboardingSteps({ current, className }: { current: 1 | 2; className?: string }) {
  return (
    <ol
      aria-label="Pasos para empezar"
      className={cn("flex gap-2 text-[13px] font-semibold", className)}
    >
      {STEPS.map((label, index) => {
        const step = index + 1;
        const done = step < current;
        const active = step === current;
        return (
          <li
            key={label}
            aria-current={active ? "step" : undefined}
            className={cn(
              "flex h-[34px] flex-1 items-center justify-center gap-1.5 rounded-full",
              active && "bg-ink text-brand",
              done && "bg-brand-hover text-ink",
              !active && !done && "bg-brand-soft text-brand-ink",
            )}
          >
            {done ? (
              <Check className="size-3.5" strokeWidth={2.6} aria-hidden="true" />
            ) : (
              `${step} ·`
            )}{" "}
            {label}
            {done && <span className="sr-only"> (listo)</span>}
          </li>
        );
      })}
    </ol>
  );
}
