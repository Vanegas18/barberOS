import { z } from "zod";
import { objectIdSchema } from "./ids.ts";

export const INVITATION_TTL_DAYS = 7;

export const INVITABLE_ROLES = ["admin", "barber"] as const;
export type InvitableRole = (typeof INVITABLE_ROLES)[number];

export const INVITATION_STATUSES = ["pending", "accepted", "revoked"] as const;
export type InvitationStatus = (typeof INVITATION_STATUSES)[number];

export const createInvitationSchema = z
  .object({
    role: z.enum(INVITABLE_ROLES, "Rol inválido"),
    employeeId: objectIdSchema.optional(),
  })
  .refine((v) => v.role !== "barber" || v.employeeId !== undefined, {
    path: ["employeeId"],
    message: "Elige el empleado al que vas a invitar",
  });
export type CreateInvitationInput = z.infer<typeof createInvitationSchema>;

export const invitationTokenSchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/, "Enlace inválido");

export interface Invitation {
  id: string;
  role: InvitableRole;
  employeeId: string | null;
  employeeName: string | null;
  status: InvitationStatus;
  expiresAt: string;
  createdAt: string;
}

export interface CreatedInvitation {
  invitation: Invitation;
  token: string;
  inviteUrl: string;
}

export interface InvitationPreview {
  businessName: string;
  role: InvitableRole;
  employeeName: string | null;
  expiresAt: string;
}

export interface AcceptedInvitation {
  businessId: string;
  slug: string;
  role: InvitableRole;
}
