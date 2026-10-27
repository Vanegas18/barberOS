"use client";

import { timeToMinutes, minutesToTime, type Workday } from "@barberos/contracts";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { formatDuration } from "@/lib/format";
import { LUNCH_OPTIONS } from "./labels";

const selectClass =
  "h-11 w-full rounded-md border border-control bg-surface px-3 text-base text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";

function defaultLunchStart(day: Workday): string {
  const start = timeToMinutes(day.start);
  const end = timeToMinutes(day.end);
  const middle = Math.round((start + end) / 2 / 5) * 5;
  return minutesToTime(Math.max(start + 5, Math.min(middle, end - 30)));
}

export function WorkdayFields({
  idPrefix,
  value,
  onChange,
  error,
}: {
  idPrefix: string;
  value: Workday;
  onChange: (value: Workday) => void;
  error?: string;
}) {
  const lunchOn = value.lunch !== null;

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${idPrefix}-start`} className="text-[13px] font-semibold">
            Entrada
          </label>
          <Input
            id={`${idPrefix}-start`}
            type="time"
            step={300}
            value={value.start}
            onChange={(e) => onChange({ ...value, start: e.target.value })}
            aria-invalid={error ? true : undefined}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${idPrefix}-end`} className="text-[13px] font-semibold">
            Salida habitual
          </label>
          <Input
            id={`${idPrefix}-end`}
            type="time"
            step={300}
            value={value.end}
            onChange={(e) => onChange({ ...value, end: e.target.value })}
            aria-invalid={error ? true : undefined}
          />
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <label htmlFor={`${idPrefix}-lunch`} className="text-[13px] font-semibold">
          Almuerzo
        </label>
        <Switch
          id={`${idPrefix}-lunch`}
          checked={lunchOn}
          onCheckedChange={(on) =>
            onChange({
              ...value,
              lunch: on ? { start: defaultLunchStart(value), durationMinutes: 90 } : null,
            })
          }
        />
      </div>

      {value.lunch && (
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${idPrefix}-lunch-start`} className="text-[13px] font-semibold">
              Desde
            </label>
            <Input
              id={`${idPrefix}-lunch-start`}
              type="time"
              step={300}
              value={value.lunch.start}
              onChange={(e) =>
                onChange({ ...value, lunch: { ...value.lunch!, start: e.target.value } })
              }
              aria-invalid={error ? true : undefined}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${idPrefix}-lunch-duration`} className="text-[13px] font-semibold">
              Duración
            </label>
            <select
              id={`${idPrefix}-lunch-duration`}
              className={selectClass}
              value={value.lunch.durationMinutes}
              onChange={(e) =>
                onChange({
                  ...value,
                  lunch: { ...value.lunch!, durationMinutes: Number(e.target.value) },
                })
              }
            >
              {LUNCH_OPTIONS.map((m) => (
                <option key={m} value={m}>
                  {formatDuration(m)}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="text-[13px] font-semibold text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
