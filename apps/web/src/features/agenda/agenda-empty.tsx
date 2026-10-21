"use client";

import { Check, Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { formatLongDate } from "@/features/businesses/labels";
import { useCurrentBusiness } from "@/features/panel/panel-context";
import { cn } from "@/lib/utils";

const NO_BARBERS = "Agrega al menos un barbero para crear citas.";

function today(timeZone: string): string {
  const text = formatLongDate(new Date().toISOString(), timeZone);
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function AgendaEmpty() {
  const business = useCurrentBusiness();
  const isBarber = business.role === "barber";
  const [date] = useState(() => today(business.timezone));

  return (
    <div className="mx-auto flex w-full max-w-[1040px] flex-col gap-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-semibold text-ink-muted" suppressHydrationWarning>
            {date}
          </p>
          <h1 className="text-[28px] leading-9 font-bold tracking-[-0.01em]">
            {isBarber ? "Mi agenda" : "Agenda de hoy"}
          </h1>
        </div>
        {!isBarber && (
          <div className="flex flex-col gap-1.5 sm:items-end">
            <div className="flex gap-2">
              <Button variant="secondary" disabled aria-describedby="agenda-disabled-reason">
                Atender sin cita
              </Button>
              <Button disabled aria-describedby="agenda-disabled-reason">
                <Plus aria-hidden="true" />
                Nueva cita
              </Button>
            </div>
            <p id="agenda-disabled-reason" className="text-[13px] text-ink-muted">
              {NO_BARBERS}
            </p>
          </div>
        )}
      </header>

      <div className={cn("grid gap-6", !isBarber && "lg:grid-cols-[minmax(0,1fr)_340px]")}>
        <section
          aria-labelledby="citas-title"
          className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-5 sm:p-6"
        >
          <div className="flex items-center justify-between gap-3">
            <h2 id="citas-title" className="text-lg font-bold">
              Citas del día
            </h2>
            <StatusPill tone="done">0 citas</StatusPill>
          </div>
          <div className="flex flex-col items-center gap-2 rounded-md border-[1.5px] border-dashed border-line-strong px-6 py-12 text-center">
            <p className="text-[15px] font-semibold">
              {isBarber ? "Hoy no tienes citas" : "Todavía no hay citas"}
            </p>
            <p className="max-w-[340px] text-sm leading-[21px] text-ink-muted">
              {isBarber
                ? "Cuando te asignen una cita aparecerá aquí, en orden de hora."
                : "Cuando tengas barberos, aquí verás cada silla del día: quién llega, quién está atendiendo y quién falta."}
            </p>
          </div>
        </section>

        {!isBarber && <SetupChecklist />}
      </div>
    </div>
  );
}

const STEPS = [
  { label: "Crear tu barbería", done: true },
  { label: "Agregar barberos", done: false, soon: true },
  { label: "Agregar servicios y precios", done: false, soon: true },
] as const;

function SetupChecklist() {
  const doneCount = STEPS.filter((s) => s.done).length;
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
          {doneCount} de {STEPS.length}
        </span>
      </div>
      <div
        role="progressbar"
        aria-label="Avance de la configuración"
        aria-valuemin={0}
        aria-valuemax={STEPS.length}
        aria-valuenow={doneCount}
        className="h-2 overflow-hidden rounded-full bg-surface"
      >
        <div
          className="h-full rounded-full bg-ink"
          style={{ width: `${(doneCount / STEPS.length) * 100}%` }}
        />
      </div>
      <ol className="flex flex-col gap-2">
        {STEPS.map((step) => (
          <li
            key={step.label}
            className="flex min-h-12 items-center gap-3 rounded-md bg-surface px-3 py-2"
          >
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
            {"soon" in step && <StatusPill tone="done">Muy pronto</StatusPill>}
          </li>
        ))}
      </ol>
    </section>
  );
}
