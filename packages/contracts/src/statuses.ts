import { z } from "zod";

export const MEMBERSHIP_STATUSES = ["active", "invited", "suspended"] as const;
export const membershipStatusSchema = z.enum(MEMBERSHIP_STATUSES);
export type MembershipStatus = z.infer<typeof membershipStatusSchema>;

export const APPOINTMENT_STATUSES = [
  "pending",
  "confirmed",
  "in_service",
  "completed",
  "cancelled",
  "no_show",
] as const;
export const appointmentStatusSchema = z.enum(APPOINTMENT_STATUSES);
export type AppointmentStatus = z.infer<typeof appointmentStatusSchema>;
