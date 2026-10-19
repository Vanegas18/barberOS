import type { LoginInput, RegisterInput } from "@barberos/contracts";
import { AppError } from "../../shared/errors/app-error.js";
import { withTransaction } from "../../shared/db/transaction.js";
import { hashPassword, verifyPassword } from "./password.service.js";
import { SessionModel } from "./session.model.js";
import { issueSession, revokeAllUserSessions } from "./session.service.js";
import type { IssuedTokens } from "./session.service.js";
import { hashRefreshToken } from "./token.service.js";
import { UserModel } from "./user.model.js";

export interface PublicUser {
  id: string;
  name: string;
  email: string;
}

export interface AuthResult {
  user: PublicUser;
  tokens: IssuedTokens;
}

function toPublicUser(user: { _id: { toString(): string }; name: string; email: string }) {
  return { id: user._id.toString(), name: user.name, email: user.email };
}

export async function registerUser(
  input: RegisterInput,
  userAgent: string | undefined,
): Promise<AuthResult> {
  // El hash se calcula fuera de la transacción: es lento y no necesita estar dentro.
  const passwordHash = await hashPassword(input.password);

  try {
    return await withTransaction(async (session) => {
      const [user] = await UserModel.create(
        [{ name: input.name, email: input.email, passwordHash }],
        { session },
      );
      if (!user) throw new Error("No se pudo crear el usuario");

      const tokens = await issueSession(user._id, userAgent, session);

      return { user: toPublicUser(user), tokens };
    });
  } catch (err) {
    if (isDuplicateKeyError(err)) {
      throw AppError.conflict("No se pudo completar el registro");
    }
    throw err;
  }
}

function isDuplicateKeyError(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: number }).code === 11000;
}

// Hash falso para igualar tiempos cuando el email no existe. Se calcula una sola vez.
let dummyHash: Promise<string> | undefined;
function getDummyHash(): Promise<string> {
  dummyHash ??= hashPassword("contraseña-falsa-para-igualar-tiempos");
  return dummyHash;
}

export async function loginUser(
  input: LoginInput,
  userAgent: string | undefined,
): Promise<AuthResult> {
  const user = await UserModel.findOne({ email: input.email }).select("+passwordHash");

  // Siempre verificamos una contraseña, exista o no el usuario.
  const hashToCheck = user?.passwordHash ?? (await getDummyHash());
  const passwordOk = await verifyPassword(hashToCheck, input.password);

  if (!user || !passwordOk || user.status !== "active") {
    throw AppError.unauthorized("Credenciales inválidas");
  }

  const tokens = await issueSession(user._id, userAgent);
  return { user: toPublicUser(user), tokens };
}

export async function refreshSession(
  refreshToken: string,
  userAgent: string | undefined,
): Promise<IssuedTokens> {
  const invalid = () => AppError.unauthorized("Sesión inválida");

  const existing = await SessionModel.findOne({ refreshTokenHash: hashRefreshToken(refreshToken) });
  if (!existing) throw invalid();

  // Token ya rotado o revocado presentado otra vez: posible robo. Cerramos todas las sesiones.
  if (existing.revokedAt) {
    await revokeAllUserSessions(existing.userId);
    throw invalid();
  }

  if (existing.expiresAt <= new Date()) throw invalid();

  const user = await UserModel.findById(existing.userId);
  if (!user || user.status !== "active") throw invalid();

  // Revocar el token viejo y emitir el nuevo, todo o nada.
  // El filtro "revokedAt no existe" hace que solo un uso concurrente gane.
  const tokens = await withTransaction(async (session) => {
    const revoked = await SessionModel.findOneAndUpdate(
      { _id: existing._id, revokedAt: { $exists: false } },
      { $set: { revokedAt: new Date() } },
      { session },
    );
    if (!revoked) return null;
    return issueSession(existing.userId, userAgent, session);
  });

  if (!tokens) {
    await revokeAllUserSessions(existing.userId);
    throw invalid();
  }

  return tokens;
}

export async function getCurrentUser(userId: string): Promise<PublicUser> {
  const user = await UserModel.findById(userId);
  if (!user || user.status !== "active") throw AppError.unauthorized();
  return toPublicUser(user);
}
