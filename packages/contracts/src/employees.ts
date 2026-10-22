import { z } from "zod";
import { optionalPhoneSchema } from "./phone.ts";

export const EARNING_MAX_FIXED_AMOUNT = 10_000_000;

export const earningRuleSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("percentage"),
    rateBp: z
      .number("El porcentaje debe ser un número")
      .int("El porcentaje va en puntos base enteros (50 % = 5000)")
      .min(0, "El porcentaje no puede ser negativo")
      .max(10_000, "El porcentaje no puede superar el 100 %"),
  }),
  z.object({
    type: z.literal("fixed"),
    amount: z
      .number("El monto debe ser un número")
      .int("El monto va sin decimales")
      .min(0, "El monto no puede ser negativo")
      .max(EARNING_MAX_FIXED_AMOUNT, "El monto es demasiado alto"),
  }),
  z.object({ type: z.literal("none") }),
]);
export type EarningRule = z.infer<typeof earningRuleSchema>;

export const employeeNameSchema = z
  .string()
  .trim()
  .min(2, "El nombre debe tener al menos 2 caracteres")
  .max(40, "El nombre no puede superar 40 caracteres");

export const createEmployeeSchema = z.object({
  displayName: employeeNameSchema,
  phone: optionalPhoneSchema.optional(),
  earningRule: earningRuleSchema.optional(),
  acceptsOnlineBookings: z.boolean().default(true),
  linkSelf: z.boolean().default(false),
});
export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;

export const updateEmployeeSchema = z
  .object({
    displayName: employeeNameSchema.optional(),
    phone: optionalPhoneSchema.optional(),
    earningRule: earningRuleSchema.optional(),
    acceptsOnlineBookings: z.boolean().optional(),
    active: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, "Debes enviar al menos un campo");
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;

export interface Employee {
  id: string;
  displayName: string;
  phone: string | null;
  earningRule: EarningRule;
  acceptsOnlineBookings: boolean;
  active: boolean;
  hasAccount: boolean;
  isMe: boolean;
  createdAt: string;
  updatedAt: string;
}
