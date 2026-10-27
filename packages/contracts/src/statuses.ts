import { z } from "zod";

export const MEMBERSHIP_STATUSES = ["active", "invited", "suspended"] as const;
export const membershipStatusSchema = z.enum(MEMBERSHIP_STATUSES);
export type MembershipStatus = z.infer<typeof membershipStatusSchema>;

/**
 * Estado comercial del negocio (lo controla la plataforma, no el owner).
 * - trial: periodo de prueba hasta `trialEndsAt`.
 * - active: habilitado.
 * - suspended: bloqueado (p. ej., falta de pago). Los datos se conservan.
 */
export const BUSINESS_STATUSES = ["trial", "active", "suspended"] as const;
export const businessStatusSchema = z.enum(BUSINESS_STATUSES);
export type BusinessStatus = z.infer<typeof businessStatusSchema>;

export const APPOINTMENT_STATUSES = [
  "pending",
  "in_service",
  "completed",
  "cancelled",
  "no_show",
] as const;
export const appointmentStatusSchema = z.enum(APPOINTMENT_STATUSES);
export type AppointmentStatus = z.infer<typeof appointmentStatusSchema>;

/** Acceso efectivo al panel, calculado por la API a partir del estado y la fecha de prueba. */
export const BUSINESS_ACCESS = ["ok", "suspended", "trial_expired"] as const;
export type BusinessAccess = (typeof BUSINESS_ACCESS)[number];
