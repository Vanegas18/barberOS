import mongoose from "mongoose";
import type { ClientSession } from "mongoose";

/**
 * Ejecuta `fn` dentro de una transacción de MongoDB.
 * - Si `fn` termina bien, se confirman todas las escrituras (commit).
 * - Si `fn` lanza un error, se deshace todo (rollback) y el error se propaga.
 *
 * IMPORTANTE:
 * - Toda operación que deba ser parte de la transacción debe recibir `{ session }`.
 * - MongoDB puede reintentar `fn` ante errores transitorios, así que dentro de `fn`
 *   no se deben hacer efectos externos (enviar correos, escribir logs de negocio, etc.).
 */
export async function withTransaction<T>(fn: (session: ClientSession) => Promise<T>): Promise<T> {
  return mongoose.connection.transaction(fn);
}
