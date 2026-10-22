import { z } from "zod";

export const SERVICE_DURATION_STEP_MINUTES = 5;
export const SERVICE_MIN_DURATION_MINUTES = 5;
export const SERVICE_MAX_DURATION_MINUTES = 480;
export const SERVICE_MAX_PRICE = 100_000_000;

export const serviceNameSchema = z
  .string()
  .trim()
  .min(2, "El nombre debe tener al menos 2 caracteres")
  .max(60, "El nombre no puede superar 60 caracteres");

export const servicePriceSchema = z
  .number("El precio debe ser un número")
  .int("El precio va sin decimales")
  .min(0, "El precio no puede ser negativo")
  .max(SERVICE_MAX_PRICE, "El precio es demasiado alto");

export const serviceDurationSchema = z
  .number("La duración debe ser un número")
  .int("La duración va en minutos enteros")
  .min(SERVICE_MIN_DURATION_MINUTES, "La duración mínima es de 5 minutos")
  .max(SERVICE_MAX_DURATION_MINUTES, "La duración máxima es de 8 horas")
  .multipleOf(SERVICE_DURATION_STEP_MINUTES, "La duración va en pasos de 5 minutos");

export const serviceDescriptionSchema = z
  .string()
  .trim()
  .max(300, "La descripción no puede superar 300 caracteres")
  .nullable();

export const createServiceSchema = z.object({
  name: serviceNameSchema,
  description: serviceDescriptionSchema.optional(),
  price: servicePriceSchema,
  durationMinutes: serviceDurationSchema,
  visibleOnline: z.boolean().default(true),
});
export type CreateServiceInput = z.infer<typeof createServiceSchema>;

export const updateServiceSchema = z
  .object({
    name: serviceNameSchema.optional(),
    description: serviceDescriptionSchema.optional(),
    price: servicePriceSchema.optional(),
    durationMinutes: serviceDurationSchema.optional(),
    visibleOnline: z.boolean().optional(),
    active: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, "Debes enviar al menos un campo");
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>;

export interface Service {
  id: string;
  name: string;
  description: string | null;
  price: number;
  durationMinutes: number;
  visibleOnline: boolean;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}
