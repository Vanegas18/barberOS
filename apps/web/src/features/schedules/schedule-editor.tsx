"use client";

import type { Employee } from "@barberos/contracts";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { ExceptionsEditor } from "./exceptions-editor";
import { WeekEditor } from "./week-editor";

const TABS = [
  { value: "week", label: "Semana" },
  { value: "exceptions", label: "Días especiales" },
] as const;

type Tab = (typeof TABS)[number]["value"];

export function ScheduleEditor({
  businessId,
  employee,
  timeZone,
  onDone,
}: {
  businessId: string;
  employee: Employee;
  timeZone: string;
  onDone: () => void;
}) {
  const [tab, setTab] = useState<Tab>("week");

  return (
    <div className="flex flex-col gap-5">
      <div
        role="tablist"
        aria-label="Horario"
        className="grid grid-cols-2 gap-1 rounded-full bg-sunken p-1"
      >
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            role="tab"
            id={`tab-${t.value}`}
            aria-selected={tab === t.value}
            aria-controls={`panel-${t.value}`}
            onClick={() => setTab(t.value)}
            className={cn(
              "h-10 rounded-full text-sm font-semibold transition-colors duration-150",
              tab === t.value ? "bg-surface text-ink shadow-sm" : "text-ink-muted hover:text-ink",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === "week" ? (
          <WeekEditor businessId={businessId} employee={employee} onSaved={onDone} />
        ) : (
          <ExceptionsEditor businessId={businessId} employee={employee} timeZone={timeZone} />
        )}
      </div>
    </div>
  );
}
