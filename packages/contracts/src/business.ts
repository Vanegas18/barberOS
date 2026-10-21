import { z } from "zod";
import type { BusinessAccess, BusinessStatus } from "./statuses.ts";
import type { Role } from "./roles.ts";

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
  // Rutas propias del frontend (en español)
  "ingresar",
  "registro",
  "inicio",
  "negocios",
  "cuenta",
  "ajustes",
  "ayuda",
  "soporte",
  "recuperar",
  "reservas",
  "precios",
  "terminos",
  "privacidad",
];

export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "El identificador debe tener al menos 3 caracteres")
  .max(40, "El identificador no puede superar 40 caracteres")
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Solo letras minúsculas, números y guiones")
  .refine((v) => !RESERVED_SLUGS.includes(v), "Este identificador no está disponible");

export function slugify(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // quita tildes
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/g, "");
}
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

/**
 * Código emitido por la plataforma (ej. BRB-7K2M-Q9XD-4F8T). Aquí solo se valida la forma
 * general; la API lo normaliza (mayúsculas, sin guiones ni espacios) y lo verifica.
 */
export const activationCodeSchema = z
  .string()
  .trim()
  .min(1, "Ingresa el código de activación")
  .max(40, "Código de activación inválido");

export const createBusinessSchema = z.object({
  name: z.string().trim().min(2, "Nombre demasiado corto").max(80),
  slug: slugSchema,
  activationCode: activationCodeSchema,
  currency: currencySchema.default("COP"),
  timezone: timezoneSchema.default("America/Bogota"),
});
export type CreateBusinessInput = z.infer<typeof createBusinessSchema>;

export const updateBusinessSchema = z
  .object({
    name: createBusinessSchema.shape.name.optional(),
    timezone: timezoneSchema.optional(),
  })
  .refine((v) => Object.keys(v).length > 0, "Debes enviar al menos un campo");
export type UpdateBusinessInput = z.infer<typeof updateBusinessSchema>;

export interface BusinessSummary {
  id: string;
  name: string;
  slug: string;
  currency: string;
  timezone: string;
  status: BusinessStatus;
  trialEndsAt: string | null;
  access: BusinessAccess;
}

export interface BusinessWithRole extends BusinessSummary {
  role: Role;
}
