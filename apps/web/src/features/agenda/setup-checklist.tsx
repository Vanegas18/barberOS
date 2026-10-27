"use client";

import { Check, ChevronRight } from "lucide-react";
import Link from "next/link";
import { StatusPill } from "@/components/ui/status-pill";
import { useCurrentBusiness } from "@/features/panel/panel-context";
import { cn } from "@/lib/utils";

interface Step {
  label: string;
  done: boolean;
  href?: string;
}

export function SetupChecklist({
  hasBarbers,
  hasServices,
}: {
  hasBarbers: boolean;
  hasServices: boolean;
}) {
  const business = useCurrentBusiness();
  const steps: Step[] = [
    { label: "Crear tu barbería", done: true },
    { label: "Agregar barberos", done: hasBarbers, href: `/${business.slug}/equipo` },
    {
      label: "Agregar servicios y precios",
      done: hasServices,
      href: `/${business.slug}/ajustes/servicios`,
    },
  ];
  const doneCount = steps.filter((s) => s.done).length;

  return (
    <section
      aria-labelledby="setup-title"
      className="flex flex-col gap-4 self-start rounded-lg bg-brand-soft p-5 sm:p-6"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 id="setup-title" className="text-lg font-bold">
          Arma tu barbería
        </h2>
        <span className="text-sm font-semibold text-brand-ink">
          {doneCount} de {steps.length}
        </span>
      </div>
      <div
        role="progressbar"
        aria-label="Avance de la configuración"
        aria-valuemin={0}
        aria-valuemax={steps.length}
        aria-valuenow={doneCount}
        className="h-2 overflow-hidden rounded-full bg-surface"
      >
        <div
          className="h-full rounded-full bg-ink transition-[width] duration-200"
          style={{ width: `${(doneCount / steps.length) * 100}%` }}
        />
      </div>
      <ol className="flex flex-col gap-2">
        {steps.map((step) => (
          <li key={step.label}>
            <StepRow step={step} />
          </li>
        ))}
      </ol>
    </section>
  );
}

function StepRow({ step }: { step: Step }) {
  const content = (
    <>
      <span
        aria-hidden="true"
        className={cn(
          "flex size-7 shrink-0 items-center justify-center rounded-full",
          step.done ? "bg-ink text-brand" : "border-[1.5px] border-control",
        )}
      >
        {step.done && <Check className="size-4" strokeWidth={2.5} />}
      </span>
      <span
        className={cn(
          "flex-1 text-sm",
          step.done ? "text-ink-muted line-through" : "font-semibold",
        )}
      >
        {step.label}
        {step.done && <span className="sr-only"> (hecho)</span>}
      </span>
      {!step.done && !step.href && <StatusPill tone="done">Muy pronto</StatusPill>}
      {!step.done && step.href && (
        <ChevronRight className="size-4 text-ink-muted" aria-hidden="true" />
      )}
    </>
  );
  const row = "flex min-h-12 items-center gap-3 rounded-md bg-surface px-3 py-2";

  if (!step.done && step.href) {
    return (
      <Link href={step.href} className={cn(row, "transition-colors duration-150 hover:bg-ground")}>
        {content}
      </Link>
    );
  }
  return <div className={row}>{content}</div>;
}
