import { z } from "zod";
import { phoneSchema } from "./phone.ts";

export const WALK_IN_DEFAULT_NAME = "Cliente de paso";
export const CUSTOMER_SEARCH_LIMIT = 10;

export const customerNameSchema = z
  .string("Ingresa el nombre")
  .trim()
  .min(2, "El nombre debe tener al menos 2 caracteres")
  .max(60, "El nombre no puede superar 60 caracteres");

export const customerNoteSchema = z
  .string()
  .trim()
  .max(300, "La nota no puede superar 300 caracteres")
  .nullable();

export const createCustomerSchema = z.object({
  name: customerNameSchema,
  phone: phoneSchema,
  note: customerNoteSchema.optional(),
});
export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;

export const updateCustomerSchema = z
  .object({
    name: customerNameSchema.optional(),
    phone: phoneSchema.optional(),
    note: customerNoteSchema.optional(),
  })
  .refine((v) => Object.keys(v).length > 0, "Debes enviar al menos un campo");
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;

export const customerSearchQuerySchema = z.object({
  q: z
    .string()
    .trim()
    .min(2, "Escribe al menos 2 caracteres")
    .max(60, "La búsqueda es demasiado larga"),
});
export type CustomerSearchQuery = z.infer<typeof customerSearchQuerySchema>;

export interface Customer {
  id: string;
  name: string;
  phone: string;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}
