"use client";

import {
  DEFAULT_WEEKLY_SCHEDULE,
  MAX_EXCEPTION_RANGE_DAYS,
  calendarDateSchema,
  weekdayOf,
  workdaySchema,
  type Employee,
  type ScheduleException,
  type Workday,
} from "@barberos/contracts";
import { CalendarOff, Trash2 } from "lucide-react";
import { useState } from "react";
import { PageError, PageLoading } from "@/components/feedback/page-state";
import { FormAlert } from "@/components/forms/form-alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusPill } from "@/components/ui/status-pill";
import { Switch } from "@/components/ui/switch";
import { errorMessage } from "@/lib/api/client";
import { useDeleteException, useExceptions, useSaveException } from "./hooks";
import { addDays, formatShortDate, formatTime, todayIn } from "./labels";
import { WorkdayFields } from "./workday-fields";

export function ExceptionsEditor({
  businessId,
  employee,
  timeZone,
}: {
  businessId: string;
  employee: Employee;
  timeZone: string;
}) {
  const [today] = useState(() => todayIn(timeZone));
  const until = addDays(today, MAX_EXCEPTION_RANGE_DAYS - 1);
  const exceptions = useExceptions(businessId, employee.id, today, until);

  return (
    <div className="flex flex-col gap-5">
      <p className="text-[13px] text-ink-muted">
        Para un día puntual: festivo, cita médica o una quincena en la que se quedan hasta tarde.
      </p>

      <NewException businessId={businessId} employee={employee} today={today} until={until} />

      <section aria-labelledby="exceptions-title" className="flex flex-col gap-2.5">
        <h3 id="exceptions-title" className="text-sm font-semibold">
          Próximos días especiales
        </h3>
        {exceptions.isPending && <PageLoading label="Cargando días especiales…" />}
        {exceptions.isError && (
          <PageError
            message="No pudimos cargar los días especiales."
            onRetry={() => void exceptions.refetch()}
          />
        )}
        {exceptions.data && exceptions.data.length === 0 && (
          <p className="rounded-md bg-ground px-4 py-3 text-sm text-ink-muted">
            No hay días especiales. Se usa la semana de siempre.
          </p>
        )}
        {exceptions.data && exceptions.data.length > 0 && (
          <ul className="flex flex-col gap-2">
            {exceptions.data.map((exception) => (
              <li key={exception.date}>
                <ExceptionRow
                  businessId={businessId}
                  employeeId={employee.id}
                  exception={exception}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function NewException({
  businessId,
  employee,
  today,
  until,
}: {
  businessId: string;
  employee: Employee;
  today: string;
  until: string;
}) {
  const save = useSaveException(businessId, employee.id);
  const [date, setDate] = useState("");
  const [works, setWorks] = useState(false);
  const [workday, setWorkday] = useState<Workday>(structuredClone(DEFAULT_WEEKLY_SCHEDULE.monday!));
  const [note, setNote] = useState("");
  const [error, setError] = useState<string>();

  const pickDate = (value: string) => {
    setDate(value);
    setError(undefined);
    if (calendarDateSchema.safeParse(value).success) {
      const usual = employee.weeklySchedule[weekdayOf(value)];
      if (usual) setWorkday(structuredClone(usual));
    }
  };

  const submit = async () => {
    setError(undefined);
    if (!calendarDateSchema.safeParse(date).success || date < today) {
      setError("Elige una fecha de hoy en adelante.");
      return;
    }
    if (works) {
      const parsed = workdaySchema.safeParse(workday);
      if (!parsed.success) {
        setError(parsed.error.issues[0]?.message);
        return;
      }
    }
    try {
      await save.mutateAsync({
        date,
        input: { workday: works ? workday : null, note: note.trim() || null },
      });
      setDate("");
      setNote("");
      setWorks(false);
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <section
      aria-labelledby="new-exception-title"
      className="flex flex-col gap-3 rounded-md border border-line p-4"
    >
      <h3 id="new-exception-title" className="text-sm font-semibold">
        Agregar día especial
      </h3>
      <FormAlert message={error} />

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="exception-date" className="text-[13px] font-semibold">
            Fecha
          </label>
          <Input
            id="exception-date"
            type="date"
            min={today}
            max={until}
            value={date}
            onChange={(e) => pickDate(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="exception-note" className="text-[13px] font-semibold">
            Nota <span className="font-normal text-ink-muted">(opcional)</span>
          </label>
          <Input
            id="exception-note"
            maxLength={120}
            placeholder="Festivo, quincena…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <label htmlFor="exception-works" className="text-[13px] font-semibold">
          {works ? "Trabaja con otro horario" : "No trabaja ese día"}
        </label>
        <Switch id="exception-works" checked={works} onCheckedChange={setWorks} />
      </div>

      {works && <WorkdayFields idPrefix="exception" value={workday} onChange={setWorkday} />}

      <div className="flex justify-end">
        <Button type="button" onClick={submit} disabled={save.isPending} aria-busy={save.isPending}>
          {save.isPending ? "Guardando…" : "Guardar día especial"}
        </Button>
      </div>
    </section>
  );
}

function ExceptionRow({
  businessId,
  employeeId,
  exception,
}: {
  businessId: string;
  employeeId: string;
  exception: ScheduleException;
}) {
  const remove = useDeleteException(businessId, employeeId);
  const { workday } = exception;

  return (
    <div className="flex items-center gap-3 rounded-md border border-line bg-surface px-4 py-3">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold capitalize">
            {formatShortDate(exception.date)}
          </span>
          {workday ? (
            <StatusPill tone="neutral">
              {formatTime(workday.start)} a {formatTime(workday.end)}
            </StatusPill>
          ) : (
            <StatusPill tone="pending">
              <CalendarOff className="size-3.5" aria-hidden="true" />
              No trabaja
            </StatusPill>
          )}
        </div>
        {exception.note && <p className="truncate text-[13px] text-ink-muted">{exception.note}</p>}
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => remove.mutate(exception.date)}
        disabled={remove.isPending}
        aria-label={`Quitar el día especial del ${formatShortDate(exception.date)}`}
      >
        <Trash2 aria-hidden="true" />
      </Button>
    </div>
  );
}
