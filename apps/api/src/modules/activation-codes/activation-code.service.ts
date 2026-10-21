import { createHash, randomInt } from "node:crypto";
import { Types } from "mongoose";
import type { ClientSession } from "mongoose";
import { AppError } from "../../shared/errors/app-error.js";
import { ActivationCodeModel } from "./activation-code.model.js";

/** Base32 de Crockford: sin I, L, O ni U para evitar confusiones al dictarlo o copiarlo. */
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const PREFIX = "BRB";
const BODY_LENGTH = 12; // 12 × 5 bits = 60 bits de entropía
const GROUP = 4;
const DAY_MS = 24 * 60 * 60 * 1000;

function hashCode(canonical: string): string {
  return createHash("sha256").update(canonical).digest("hex");
}

/**
 * Lleva lo que escribió el usuario a su forma canónica (12 caracteres, sin prefijo).
 * Acepta minúsculas, espacios, guiones y las confusiones típicas (O→0, I/L→1).
 * Devuelve null si no tiene la forma de un código.
 */
export function normalizeActivationCode(raw: string): string | null {
  let value = raw.toUpperCase().replace(/[\s-]/g, "").replace(/O/g, "0").replace(/[IL]/g, "1");

  if (value.length === PREFIX.length + BODY_LENGTH && value.startsWith(PREFIX)) {
    value = value.slice(PREFIX.length);
  }
  if (value.length !== BODY_LENGTH) return null;
  for (const char of value) {
    if (!ALPHABET.includes(char)) return null;
  }
  return value;
}

/** "7K2MQ9XD4F8T" → "BRB-7K2M-Q9XD-4F8T" */
export function formatActivationCode(canonical: string): string {
  const groups = canonical.match(new RegExp(`.{1,${GROUP}}`, "g")) ?? [];
  return [PREFIX, ...groups].join("-");
}

function generateCanonical(): string {
  let body = "";
  for (let i = 0; i < BODY_LENGTH; i++) body += ALPHABET[randomInt(ALPHABET.length)];
  return body;
}

export interface IssueActivationCodeInput {
  label: string;
  trialDays?: number;
  expiresInDays?: number;
}

export interface IssuedActivationCode {
  id: string;
  code: string; // en claro: solo existe en esta respuesta
  label: string;
  trialDays: number;
  expiresAt: Date;
}

export async function issueActivationCode(
  input: IssueActivationCodeInput,
): Promise<IssuedActivationCode> {
  const trialDays = input.trialDays ?? 0;
  const expiresInDays = input.expiresInDays ?? 30;
  const canonical = generateCanonical();

  const doc = await ActivationCodeModel.create({
    codeHash: hashCode(canonical),
    label: input.label,
    trialDays,
    expiresAt: new Date(Date.now() + expiresInDays * DAY_MS),
  });

  return {
    id: doc._id.toString(),
    code: formatActivationCode(canonical),
    label: doc.label,
    trialDays: doc.trialDays,
    expiresAt: doc.expiresAt,
  };
}

const INVALID_MESSAGE = "El código de activación no es válido, ya fue usado o venció";

function invalidActivationCode(): AppError {
  // Mismo error para inexistente, usado y vencido: no se revela cuál de los tres es.
  return new AppError(422, "INVALID_ACTIVATION_CODE", INVALID_MESSAGE, [
    { part: "body", path: "activationCode", message: INVALID_MESSAGE },
  ]);
}

/**
 * Marca el código como usado. DEBE llamarse dentro de la transacción que crea el negocio:
 * si algo falla después, el rollback devuelve el código a "sin usar".
 * El filtro `usedAt: null` hace que, ante dos usos simultáneos, solo uno gane.
 */
export async function consumeActivationCode(
  rawCode: string,
  usage: { userId: string; businessId: string },
  session: ClientSession,
): Promise<{ trialDays: number }> {
  const canonical = normalizeActivationCode(rawCode);
  if (!canonical) throw invalidActivationCode();

  const now = new Date();
  const doc = await ActivationCodeModel.findOneAndUpdate(
    { codeHash: hashCode(canonical), usedAt: null, expiresAt: { $gt: now } },
    {
      $set: {
        usedAt: now,
        usedByUserId: new Types.ObjectId(usage.userId),
        usedForBusinessId: new Types.ObjectId(usage.businessId),
      },
    },
    { session, returnDocument: "after" },
  )
    .select({ trialDays: 1 })
    .lean();

  if (!doc) throw invalidActivationCode();
  return { trialDays: doc.trialDays };
}
