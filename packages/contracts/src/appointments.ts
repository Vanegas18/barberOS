import { z } from "zod";
import { customerNameSchema } from "./customers.ts";
import { objectIdSchema } from "./ids.ts";
import { optionalPhoneSchema, phoneSchema } from "./phone.ts";
import {
  SCHEDULE_STEP_MINUTES,
  calendarDateSchema,
  timeSchema,
  timeToMinutes,
  type Workday,
} from "./schedule.ts";
import type { AppointmentStatus } from "./statuses.ts";

export const APPOINTMENT_MAX_SERVICES = 5;
export const APPOINTMENT_UNDO_MINUTES = 5;
export const MINUTES_PER_DAY = 24 * 60;

export const APPOINTMENT_SOURCES = ["internal", "walk_in", "public"] as const;
export type AppointmentSource = (typeof APPOINTMENT_SOURCES)[number];

export const APPOINTMENT_ACTIONS = ["check_in", "complete", "cancel", "no_show"] as const;
export type AppointmentAction = (typeof APPOINTMENT_ACTIONS)[number];

export const APPOINTMENT_TRANSITIONS: Record<
  AppointmentStatus,
  Partial<Record<AppointmentAction, AppointmentStatus>>
> = {
  pending: { check_in: "in_service", cancel: "cancelled", no_show: "no_show" },
  in_service: { complete: "completed", cancel: "cancelled" },
  completed: {},
  cancelled: {},
  no_show: {},
};

export function nextAppointmentStatus(
  current: AppointmentStatus,
  action: AppointmentAction,
): AppointmentStatus | null {
  return APPOINTMENT_TRANSITIONS[current][action] ?? null;
}

export const ACTIVE_APPOINTMENT_STATUSES: readonly AppointmentStatus[] = [
  "pending",
  "in_service",
  "completed",
];

export function occupiesSchedule(status: AppointmentStatus): boolean {
  return ACTIVE_APPOINTMENT_STATUSES.includes(status);
}

export function roundDownToStep(minutes: number): number {
  return minutes - (minutes % SCHEDULE_STEP_MINUTES);
}

export function appointmentEndMinutes(start: string, durations: readonly number[]): number {
  return timeToMinutes(start) + durations.reduce((sum, d) => sum + d, 0);
}

export const SCHEDULE_WARNINGS = [
  "day_off",
  "before_start",
  "after_usual_end",
  "during_lunch",
] as const;
export type ScheduleWarning = (typeof SCHEDULE_WARNINGS)[number];

export function scheduleWarnings(
  workday: Workday | null,
  startMinutes: number,
  endMinutes: number,
): ScheduleWarning[] {
  if (!workday) return ["day_off"];
  const warnings: ScheduleWarning[] = [];
  if (startMinutes < timeToMinutes(workday.start)) warnings.push("before_start");
  if (endMinutes > timeToMinutes(workday.end)) warnings.push("after_usual_end");
  if (workday.lunch) {
    const lunchStart = timeToMinutes(workday.lunch.start);
    const lunchEnd = lunchStart + workday.lunch.durationMinutes;
    if (startMinutes < lunchEnd && endMinutes > lunchStart) warnings.push("during_lunch");
  }
  return warnings;
}

const serviceIdsSchema = z
  .array(objectIdSchema)
  .min(1, "Elige al menos un servicio")
  .max(APPOINTMENT_MAX_SERVICES, `Máximo ${APPOINTMENT_MAX_SERVICES} servicios por cita`)
  .refine((ids) => new Set(ids).size === ids.length, "Hay servicios repetidos");

export const appointmentNoteSchema = z
  .string()
  .trim()
  .max(200, "La nota no puede superar 200 caracteres")
  .nullable();

export const customerRefSchema = z.union([
  z.object({ id: objectIdSchema }),
  z.object({ name: customerNameSchema, phone: phoneSchema }),
]);
export type CustomerRef = z.infer<typeof customerRefSchema>;

export const walkInCustomerSchema = z.union([
  z.object({ id: objectIdSchema }),
  z.strictObject({
    name: z
      .string()
      .trim()
      .max(60, "El nombre no puede superar 60 caracteres")
      .refine((v) => v.length === 0 || v.length >= 2, "El nombre debe tener al menos 2 caracteres")
      .optional()
      .transform((v) => (v ? v : undefined)),
    phone: optionalPhoneSchema.optional(),
  }),
]);
export type WalkInCustomer = z.infer<typeof walkInCustomerSchema>;

export const createAppointmentSchema = z.object({
  employeeId: objectIdSchema,
  date: calendarDateSchema,
  start: timeSchema,
  serviceIds: serviceIdsSchema,
  customer: customerRefSchema,
  note: appointmentNoteSchema.optional(),
});
export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;

export const walkInSchema = z.discriminatedUnion("outcome", [
  z.object({
    outcome: z.literal("in_service"),
    employeeId: objectIdSchema,
    serviceIds: serviceIdsSchema,
    customer: walkInCustomerSchema,
    note: appointmentNoteSchema.optional(),
  }),
  z.object({
    outcome: z.literal("completed"),
    employeeId: objectIdSchema,
    serviceIds: serviceIdsSchema,
    customer: walkInCustomerSchema,
    date: calendarDateSchema,
    start: timeSchema,
    note: appointmentNoteSchema.optional(),
  }),
]);
export type WalkInInput = z.infer<typeof walkInSchema>;

export const rescheduleAppointmentSchema = z
  .object({
    employeeId: objectIdSchema.optional(),
    date: calendarDateSchema.optional(),
    start: timeSchema.optional(),
    serviceIds: serviceIdsSchema.optional(),
    note: appointmentNoteSchema.optional(),
  })
  .refine((v) => Object.keys(v).length > 0, "Debes enviar al menos un campo");
export type RescheduleAppointmentInput = z.infer<typeof rescheduleAppointmentSchema>;

export const appointmentActionSchema = z.object({
  action: z.enum(APPOINTMENT_ACTIONS, "Acción inválida"),
});
export type AppointmentActionInput = z.infer<typeof appointmentActionSchema>;

export const appointmentDayQuerySchema = z.object({
  date: calendarDateSchema,
  employeeId: objectIdSchema.optional(),
});
export type AppointmentDayQuery = z.infer<typeof appointmentDayQuerySchema>;

export interface AppointmentService {
  serviceId: string;
  name: string;
  price: number;
  durationMinutes: number;
}

export interface AppointmentCustomer {
  id: string | null;
  name: string;
  phone: string | null;
}

export type AppointmentChangeKind = "created" | "rescheduled" | AppointmentAction | "undo";

export interface AppointmentChange {
  kind: AppointmentChangeKind;
  at: string;
  byMembershipId: string;
  byName: string;
  fromStatus: AppointmentStatus | null;
  toStatus: AppointmentStatus;
}

export interface Appointment {
  id: string;
  employeeId: string;
  customer: AppointmentCustomer;
  services: AppointmentService[];
  date: string;
  start: string;
  end: string;
  status: AppointmentStatus;
  source: AppointmentSource;
  recordedAfter: boolean;
  note: string | null;
  canUndo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AppointmentWithWarnings {
  appointment: Appointment;
  warnings: ScheduleWarning[];
}
