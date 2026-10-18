import { z } from "zod";

export const ROLES = ["owner", "admin", "barber"] as const;

export const roleSchema = z.enum(ROLES);

export type Role = z.infer<typeof roleSchema>;
