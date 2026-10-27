"use client";

import {
  DEFAULT_WEEKLY_SCHEDULE,
  WEEKDAYS,
  weeklyScheduleSchema,
  type Employee,
  type WeeklySchedule,
  type Weekday,
  type Workday,
} from "@barberos/contracts";
import { Copy } from "lucide-react";
import { useState } from "react";
import { FormAlert } from "@/components/forms/form-alert";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ApiError, errorMessage } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { useSaveWeekly } from "./hooks";
import { WEEKDAY_LABEL } from "./labels";
import { WorkdayFields } from "./workday-fields";

type DayErrors = Partial<Record<Weekday, string>>;

function errorsFrom(issues: { path: PropertyKey[]; message: string }[]): DayErrors {
  const result: DayErrors = {};
  for (const issue of issues) {
    const day = issue.path[0] as Weekday;
    if (WEEKDAYS.includes(day) && !result[day]) result[day] = issue.message;
  }
  return result;
}

function errorsFromApi(err: unknown): DayErrors | null {
  if (!(err instanceof ApiError) || !Array.isArray(err.details)) return null;
  const issues = (err.details as { path?: unknown; message?: unknown }[]).map((d) => ({
    path: typeof d.path === "string" ? d.path.split(".") : [],
    message: typeof d.message === "string" ? d.message : "",
  }));
  const result = errorsFrom(issues);
  return Object.keys(result).length > 0 ? result : null;
}

export function WeekEditor({
  businessId,
  employee,
  onSaved,
}: {
  businessId: string;
  employee: Employee;
  onSaved: () => void;
}) {
  const save = useSaveWeekly(businessId, employee.id);
  const [week, setWeek] = useState<WeeklySchedule>(employee.weeklySchedule);
  const [errors, setErrors] = useState<DayErrors>({});
  const [rootError, setRootError] = useState<string>();

  const setDay = (day: Weekday, value: Workday | null) => {
    setWeek((w) => ({ ...w, [day]: value }));
    setErrors((e) => ({ ...e, [day]: undefined }));
  };

  const firstWorkday = WEEKDAYS.map((d) => week[d]).find((d) => d !== null) ?? null;

  const copyToAll = () => {
    if (!firstWorkday) return;
    setWeek(
      (w) =>
        Object.fromEntries(
          WEEKDAYS.map((d) => [d, w[d] ? structuredClone(firstWorkday) : null]),
        ) as WeeklySchedule,
    );
    setErrors({});
  };

  const submit = async () => {
    setRootError(undefined);
    const parsed = weeklyScheduleSchema.safeParse(week);
    if (!parsed.success) {
      setErrors(errorsFrom(parsed.error.issues));
      return;
    }
    try {
      await save.mutateAsync(parsed.data);
      onSaved();
    } catch (err) {
      const dayErrors = errorsFromApi(err);
      if (dayErrors) setErrors(dayErrors);
      else setRootError(errorMessage(err));
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <FormAlert message={rootError} />

      <p className="text-[13px] text-ink-muted">
        La salida habitual solo limita las reservas por internet. En días llenos puedes agendar
        después de esa hora.
      </p>

      {firstWorkday && (
        <Button type="button" variant="ghost" className="-ml-3 self-start px-3" onClick={copyToAll}>
          <Copy aria-hidden="true" />
          Usar el horario del primer día en todos
        </Button>
      )}

      <ul className="flex flex-col gap-2.5">
        {WEEKDAYS.map((day) => {
          const value = week[day];
          return (
            <li
              key={day}
              className={cn(
                "flex flex-col gap-3 rounded-md border px-4 py-3",
                errors[day] ? "border-danger" : "border-line",
                !value && "bg-ground",
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <label htmlFor={`day-${day}`} className="text-[15px] font-semibold">
                  {WEEKDAY_LABEL[day]}
                </label>
                <div className="flex items-center gap-2.5">
                  <span className="text-[13px] text-ink-muted">
                    {value ? "Trabaja" : "Descansa"}
                  </span>
                  <Switch
                    id={`day-${day}`}
                    checked={value !== null}
                    onCheckedChange={(on) =>
                      setDay(
                        day,
                        on
                          ? structuredClone(firstWorkday ?? DEFAULT_WEEKLY_SCHEDULE.monday!)
                          : null,
                      )
                    }
                  />
                </div>
              </div>
              {value && (
                <WorkdayFields
                  idPrefix={`day-${day}`}
                  value={value}
                  onChange={(v) => setDay(day, v)}
                  error={errors[day]}
                />
              )}
            </li>
          );
        })}
      </ul>

      <div className="flex justify-end">
        <Button
          type="button"
          size="lg"
          onClick={submit}
          disabled={save.isPending}
          aria-busy={save.isPending}
        >
          {save.isPending ? "Guardando…" : "Guardar semana"}
        </Button>
      </div>
    </div>
  );
}
