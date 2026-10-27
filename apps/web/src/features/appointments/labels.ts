import { calendarDateSchema, type Appointment, type AppointmentStatus } from "@barberos/contracts";
import type { PillTone } from "@/components/ui/status-pill";
import { addDays, formatTime } from "@/features/schedules/labels";

export const STATUS_LABEL: Record<AppointmentStatus, string> = {
  pending: "Pendiente",
  in_service: "En silla",
  completed: "Atendida",
  cancelled: "Cancelada",
  no_show: "No vino",
};

export const STATUS_TONE: Record<AppointmentStatus, PillTone> = {
  pending: "pending",
  in_service: "live",
  completed: "done",
  cancelled: "done",
  no_show: "danger",
};

export function isClosedOut(status: AppointmentStatus): boolean {
  return status === "cancelled" || status === "no_show";
}

export function formatRange(appointment: Pick<Appointment, "start" | "end">): string {
  return `${formatTime(appointment.start)} – ${formatTime(appointment.end)}`;
}

export function appointmentTotal(appointment: Pick<Appointment, "services">): number {
  return appointment.services.reduce((sum, s) => sum + s.price, 0);
}

export function servicesSummary(appointment: Pick<Appointment, "services">): string {
  return appointment.services.map((s) => s.name).join(" + ");
}

const dayTitleFormat = new Intl.DateTimeFormat("es-CO", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});

export function formatDayTitle(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const text = dayTitleFormat.format(new Date(Date.UTC(y!, m! - 1, d!)));
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function relativeDay(date: string, today: string): string | null {
  if (date === today) return "Hoy";
  if (date === addDays(today, 1)) return "Mañana";
  if (date === addDays(today, -1)) return "Ayer";
  return null;
}

export function parseDateParam(value: string | undefined): string | null {
  const parsed = calendarDateSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}
