import { z } from "zod";

export const SCHEDULE_STEP_MINUTES = 5;
export const LUNCH_MIN_MINUTES = 15;
export const LUNCH_MAX_MINUTES = 180;

export const WEEKDAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;
export type Weekday = (typeof WEEKDAYS)[number];

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h! * 60 + m!;
}

export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export const timeSchema = z
  .string()
  .regex(/^(([01]\d|2[0-3]):[0-5]\d|24:00)$/, "Hora inválida. Usa el formato HH:mm, ej. 09:30")
  .refine(
    (t) => timeToMinutes(t) % SCHEDULE_STEP_MINUTES === 0,
    "La hora va en pasos de 5 minutos",
  );

export const lunchSchema = z.object({
  start: timeSchema,
  durationMinutes: z
    .number("La duración del almuerzo debe ser un número")
    .int("La duración va en minutos enteros")
    .min(LUNCH_MIN_MINUTES, "El almuerzo dura al menos 15 minutos")
    .max(LUNCH_MAX_MINUTES, "El almuerzo no puede durar más de 3 horas")
    .multipleOf(SCHEDULE_STEP_MINUTES, "La duración va en pasos de 5 minutos"),
});
export type Lunch = z.infer<typeof lunchSchema>;

export const workdaySchema = z
  .object({
    start: timeSchema,
    end: timeSchema,
    lunch: lunchSchema.nullable(),
  })
  .superRefine((day, ctx) => {
    const start = timeToMinutes(day.start);
    const end = timeToMinutes(day.end);
    if (end - start < 30) {
      ctx.addIssue({
        code: "custom",
        path: ["end"],
        message: "La salida debe ser al menos 30 minutos después de la entrada",
      });
      return;
    }
    if (day.lunch) {
      const lunchStart = timeToMinutes(day.lunch.start);
      const lunchEnd = lunchStart + day.lunch.durationMinutes;
      if (lunchStart <= start || lunchEnd >= end) {
        ctx.addIssue({
          code: "custom",
          path: ["lunch", "start"],
          message: "El almuerzo debe quedar dentro de la jornada",
        });
      }
    }
  });
export type Workday = z.infer<typeof workdaySchema>;

export const weeklyScheduleSchema = z.object(
  Object.fromEntries(WEEKDAYS.map((d) => [d, workdaySchema.nullable()])) as Record<
    Weekday,
    z.ZodNullable<typeof workdaySchema>
  >,
);
export type WeeklySchedule = z.infer<typeof weeklyScheduleSchema>;

const weekdayDefault: Workday = {
  start: "09:00",
  end: "19:00",
  lunch: { start: "13:00", durationMinutes: 90 },
};

export const DEFAULT_WEEKLY_SCHEDULE: WeeklySchedule = {
  monday: weekdayDefault,
  tuesday: weekdayDefault,
  wednesday: weekdayDefault,
  thursday: weekdayDefault,
  friday: weekdayDefault,
  saturday: weekdayDefault,
  sunday: null,
};

export const calendarDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida. Usa el formato AAAA-MM-DD")
  .refine((value) => {
    const [y, m, d] = value.split("-").map(Number);
    const date = new Date(Date.UTC(y!, m! - 1, d!));
    return date.getUTCFullYear() === y && date.getUTCMonth() === m! - 1 && date.getUTCDate() === d;
  }, "Esa fecha no existe");

export function weekdayOf(date: string): Weekday {
  const [y, m, d] = date.split("-").map(Number);
  const jsDay = new Date(Date.UTC(y!, m! - 1, d!)).getUTCDay();
  return WEEKDAYS[(jsDay + 6) % 7]!;
}

export const scheduleExceptionInputSchema = z.object({
  workday: workdaySchema.nullable(),
  note: z.string().trim().max(120, "La nota no puede superar 120 caracteres").nullable().optional(),
});
export type ScheduleExceptionInput = z.infer<typeof scheduleExceptionInputSchema>;

export interface ScheduleException {
  date: string;
  workday: Workday | null;
  note: string | null;
}

export const MAX_EXCEPTION_RANGE_DAYS = 93;

export const exceptionRangeQuerySchema = z
  .object({ from: calendarDateSchema, to: calendarDateSchema })
  .refine((q) => q.from <= q.to, {
    path: ["to"],
    message: "La fecha final va después de la inicial",
  })
  .refine(
    (q) =>
      (Date.parse(`${q.to}T00:00:00Z`) - Date.parse(`${q.from}T00:00:00Z`)) / 86_400_000 <
      MAX_EXCEPTION_RANGE_DAYS,
    { path: ["to"], message: "Consulta como máximo 3 meses a la vez" },
  );

export function resolveWorkday(
  weekly: WeeklySchedule,
  exception: Pick<ScheduleException, "workday"> | null,
  date: string,
): Workday | null {
  if (exception) return exception.workday;
  return weekly[weekdayOf(date)];
}
