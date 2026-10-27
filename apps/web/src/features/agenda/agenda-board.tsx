"use client";

import type { Appointment } from "@barberos/contracts";
import { useState, type ReactNode } from "react";
import { personInitials } from "@/features/businesses/labels";
import { isClosedOut } from "@/features/appointments/labels";
import { avatarTone } from "@/features/employees/labels";
import { cn } from "@/lib/utils";
import { AppointmentCard } from "./appointment-card";

export interface BoardColumn {
  id: string;
  name: string;
}

const activeCount = (list: Appointment[]) => list.filter((a) => !isClosedOut(a.status)).length;

const countLabel = (n: number) => (n === 1 ? "1 cita" : `${n} citas`);

export function AgendaBoard({
  columns,
  appointments,
  currency,
}: {
  columns: BoardColumn[];
  appointments: Appointment[];
  currency: string;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const byEmployee = new Map(columns.map((c) => [c.id, [] as Appointment[]]));
  for (const appointment of appointments) byEmployee.get(appointment.employeeId)?.push(appointment);
  const names = new Map(columns.map((c) => [c.id, c.name]));
  const visible = selected ? (byEmployee.get(selected) ?? []) : appointments;

  return (
    <>
      <div className="flex flex-col gap-4 lg:hidden">
        <div role="group" aria-label="Filtrar por barbero" className="flex flex-wrap gap-2">
          <FilterChip active={selected === null} onClick={() => setSelected(null)}>
            Todos · {activeCount(appointments)}
          </FilterChip>
          {columns.map((c) => (
            <FilterChip key={c.id} active={selected === c.id} onClick={() => setSelected(c.id)}>
              {c.name} · {activeCount(byEmployee.get(c.id) ?? [])}
            </FilterChip>
          ))}
        </div>
        <AppointmentList
          appointments={visible}
          currency={currency}
          names={selected ? undefined : names}
        />
      </div>

      <div className="hidden auto-cols-[minmax(240px,1fr)] grid-flow-col gap-4 overflow-x-auto pb-2 lg:grid">
        {columns.map((column, index) => {
          const list = byEmployee.get(column.id) ?? [];
          return (
            <section
              key={column.id}
              aria-label={`Agenda de ${column.name}`}
              className="flex flex-col gap-3 rounded-lg border border-line bg-ground/60 p-3"
            >
              <header className="flex items-center gap-2.5 px-1">
                <span
                  aria-hidden="true"
                  className={cn(
                    "flex size-9 items-center justify-center rounded-full text-sm font-bold",
                    avatarTone(index),
                  )}
                >
                  {personInitials(column.name)}
                </span>
                <div className="flex flex-col">
                  <h3 className="text-[15px] font-bold">{column.name}</h3>
                  <span className="text-[13px] text-ink-muted">
                    {countLabel(activeCount(list))}
                  </span>
                </div>
              </header>
              <AppointmentList appointments={list} currency={currency} />
            </section>
          );
        })}
      </div>
    </>
  );
}

export function AppointmentList({
  appointments,
  currency,
  names,
}: {
  appointments: Appointment[];
  currency: string;
  names?: Map<string, string>;
}) {
  if (appointments.length === 0) {
    return (
      <p className="rounded-md border-[1.5px] border-dashed border-line-strong px-4 py-8 text-center text-sm text-ink-muted">
        Sin citas este día
      </p>
    );
  }
  return (
    <ol className="flex flex-col gap-2.5">
      {appointments.map((appointment) => (
        <li key={appointment.id}>
          <AppointmentCard
            appointment={appointment}
            currency={currency}
            barberName={names?.get(appointment.employeeId)}
          />
        </li>
      ))}
    </ol>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "h-11 rounded-full border px-4 text-sm font-semibold transition-colors duration-150",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
        active ? "border-ink bg-ink text-white" : "border-control bg-surface hover:bg-ground",
      )}
    >
      {children}
    </button>
  );
}
