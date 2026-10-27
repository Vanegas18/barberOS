import { WEEKDAYS, timeToMinutes, type WeeklySchedule, type Weekday } from "@barberos/contracts";

export const WEEKDAY_LABEL: Record<Weekday, string> = {
  monday: "Lunes",
  tuesday: "Martes",
  wednesday: "Miércoles",
  thursday: "Jueves",
  friday: "Viernes",
  saturday: "Sábado",
  sunday: "Domingo",
};

const WEEKDAY_SHORT: Record<Weekday, string> = {
  monday: "Lun",
  tuesday: "Mar",
  wednesday: "Mié",
  thursday: "Jue",
  friday: "Vie",
  saturday: "Sáb",
  sunday: "Dom",
};

export const LUNCH_OPTIONS = [30, 45, 60, 75, 90, 105, 120, 150, 180];

const timeFormat = new Intl.DateTimeFormat("es-CO", {
  hour: "numeric",
  minute: "2-digit",
  timeZone: "UTC",
});

export function formatTime(time: string): string {
  const minutes = timeToMinutes(time);
  return timeFormat.format(new Date(Date.UTC(2000, 0, 1, 0, minutes)));
}

export function summarizeWeek(weekly: WeeklySchedule): string {
  const working = WEEKDAYS.filter((d) => weekly[d] !== null);
  if (working.length === 0) return "Sin días de trabajo";
  const first = weekly[working[0]!]!;
  const sameHours = working.every(
    (d) => weekly[d]!.start === first.start && weekly[d]!.end === first.end,
  );
  const days = working.map((d) => WEEKDAY_SHORT[d]).join(" ");
  return sameHours
    ? `${days} · ${formatTime(first.start)} a ${formatTime(first.end)}`
    : `${days} · horario variable`;
}

export function todayIn(timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, d! + days)).toISOString().slice(0, 10);
}

const dateFormat = new Intl.DateTimeFormat("es-CO", {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

export function formatShortDate(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return dateFormat.format(new Date(Date.UTC(y!, m! - 1, d!)));
}
