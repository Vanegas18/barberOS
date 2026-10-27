"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDayTitle, relativeDay } from "@/features/appointments/labels";
import { addDays } from "@/features/schedules/labels";

export function DayNav({
  date,
  today,
  onChange,
}: {
  date: string;
  today: string;
  onChange: (date: string) => void;
}) {
  const relative = relativeDay(date, today);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant="secondary"
        size="icon"
        aria-label="Día anterior"
        onClick={() => onChange(addDays(date, -1))}
      >
        <ChevronLeft aria-hidden="true" />
      </Button>
      <Button
        variant="secondary"
        size="icon"
        aria-label="Día siguiente"
        onClick={() => onChange(addDays(date, 1))}
      >
        <ChevronRight aria-hidden="true" />
      </Button>
      <Button variant="secondary" disabled={date === today} onClick={() => onChange(today)}>
        Hoy
      </Button>
      <label className="relative">
        <span className="sr-only">Elegir fecha</span>
        <input
          type="date"
          value={date}
          onChange={(e) => e.target.value && onChange(e.target.value)}
          className="h-11 rounded-full border border-control bg-surface px-4 text-[15px] font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        />
      </label>
      <p className="w-full text-sm font-semibold text-ink-muted sm:w-auto" aria-live="polite">
        {relative ? `${relative} · ` : ""}
        {formatDayTitle(date)}
      </p>
    </div>
  );
}
