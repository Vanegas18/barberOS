/**
 * Emite un código de activación para que un cliente cree su negocio.
 *
 *   pnpm --filter @barberos/api codes:create --label "Barbería de Carlos"
 *   pnpm --filter @barberos/api codes:create --label "Prueba Juan" --trial-days 15 --expires-in-days 7
 *
 * OJO: usa la MONGODB_URI del .env. Revisa a qué base apunta antes de emitir.
 * El código en claro solo se muestra aquí; en la base queda únicamente su hash.
 */
import { parseArgs } from "node:util";
import mongoose from "mongoose";
import { connectDb, disconnectDb } from "../shared/db/connection.js";
import { issueActivationCode } from "../modules/activation-codes/activation-code.service.js";

function toInt(value: string | undefined, fallback: number, name: string, max: number): number {
  if (value === undefined) return fallback;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0 || n > max) {
    throw new Error(`--${name} debe ser un entero entre 0 y ${max}`);
  }
  return n;
}

async function main() {
  const { values } = parseArgs({
    options: {
      label: { type: "string" },
      "trial-days": { type: "string" },
      "expires-in-days": { type: "string" },
    },
  });

  const label = values.label?.trim();
  if (!label) throw new Error('Falta --label (ej. --label "Barbería de Carlos")');

  const trialDays = toInt(values["trial-days"], 0, "trial-days", 365);
  const expiresInDays = toInt(values["expires-in-days"], 30, "expires-in-days", 365);
  if (expiresInDays < 1) throw new Error("--expires-in-days debe ser al menos 1");

  await connectDb();
  try {
    const issued = await issueActivationCode({ label, trialDays, expiresInDays });
    console.log("");
    console.log(`  Base:        ${mongoose.connection.name}`);
    console.log(`  Cliente:     ${issued.label}`);
    console.log(`  Código:      ${issued.code}`);
    console.log(
      `  Prueba:      ${issued.trialDays === 0 ? "sin prueba (nace activo)" : `${issued.trialDays} días`}`,
    );
    console.log(`  Vence:       ${issued.expiresAt.toISOString().slice(0, 10)}`);
    console.log("");
  } finally {
    await disconnectDb();
  }
}

main().catch((err) => {
  console.error("No se pudo emitir el código:", err instanceof Error ? err.message : err);
  process.exit(1);
});
