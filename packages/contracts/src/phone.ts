import { z } from "zod";

export function normalizePhone(raw: string): string | null {
  const trimmed = raw.trim();
  const digits = trimmed.replace(/[\s().-]/g, "");

  if (digits.startsWith("+")) {
    return /^\+[1-9]\d{7,14}$/.test(digits) ? digits : null;
  }
  if (/^3\d{9}$/.test(digits)) return `+57${digits}`;
  if (/^573\d{9}$/.test(digits)) return `+${digits}`;
  return null;
}

export const optionalPhoneSchema = z
  .string()
  .nullable()
  .transform((value, ctx) => {
    if (value === null || value.trim() === "") return null;
    const phone = normalizePhone(value);
    if (!phone) {
      ctx.addIssue({
        code: "custom",
        message: "Celular inválido. Ej.: 300 123 4567 o +57 300 123 4567",
      });
      return z.NEVER;
    }
    return phone;
  });
