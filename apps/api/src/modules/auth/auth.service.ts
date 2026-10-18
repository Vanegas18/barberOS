import type { RegisterInput } from "@barberos/contracts";
import { AppError } from "../../shared/errors/app-error.js";
import { withTransaction } from "../../shared/db/transaction.js";
import { hashPassword } from "./password.service.js";
import { issueSession } from "./session.service.js";
import type { IssuedTokens } from "./session.service.js";
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

      return {
        user: { id: user._id.toString(), name: user.name, email: user.email },
        tokens,
      };
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
