import { z } from "zod";

const RESERVED_SLUGS: readonly string[] = [
  "api",
  "admin",
  "app",
  "b",
  "login",
  "register",
  "forgot-password",
  "reset-password",
  "settings",
  "static",
  "www",
];

export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "El identificador debe tener al menos 3 caracteres")
  .max(40, "El identificador no puede superar 40 caracteres")
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Solo letras minúsculas, números y guiones")
  .refine((v) => !RESERVED_SLUGS.includes(v), "Este identificador no está disponible");

export const SUPPORTED_CURRENCIES = ["COP", "USD", "MXN", "EUR"] as const;
export const currencySchema = z.enum(SUPPORTED_CURRENCIES);
export type Currency = z.infer<typeof currencySchema>;

function isValidTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

export const timezoneSchema = z.string().refine(isValidTimeZone, "Zona horaria inválida");

export const createBusinessSchema = z.object({
  name: z.string().trim().min(2, "Nombre demasiado corto").max(80),
  slug: slugSchema,
  currency: currencySchema.default("COP"),
  timezone: timezoneSchema.default("America/Bogota"),
});
export type CreateBusinessInput = z.infer<typeof createBusinessSchema>;
