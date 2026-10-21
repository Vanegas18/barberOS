import type { Request, Response } from "express";
import type { LoginInput, RegisterInput } from "@barberos/contracts";
import { AppError } from "../../shared/errors/app-error.js";
import { REFRESH_COOKIE, clearAuthCookies, setAuthCookies } from "./auth.cookies.js";
import { getCurrentUser, loginUser, refreshSession, registerUser } from "./auth.service.js";
import { revokeSessionByToken } from "./session.service.js";

function readRefreshToken(req: Request): string | null {
  const token: unknown = req.cookies?.[REFRESH_COOKIE];
  return typeof token === "string" && token.length > 0 ? token : null;
}

export async function register(req: Request, res: Response): Promise<void> {
  const input = req.validated.body as RegisterInput;
  const { user, tokens } = await registerUser(input, req.get("user-agent"));
  setAuthCookies(res, tokens);
  res.status(201).json({ user });
}

export async function login(req: Request, res: Response): Promise<void> {
  const input = req.validated.body as LoginInput;
  const { user, tokens } = await loginUser(input, req.get("user-agent"));
  setAuthCookies(res, tokens);
  res.json({ user });
}

export async function refresh(req: Request, res: Response): Promise<void> {
  const token = readRefreshToken(req);
  if (!token) {
    clearAuthCookies(res);
    throw AppError.unauthorized("Sesión inválida");
  }

  try {
    const tokens = await refreshSession(token, req.get("user-agent"));
    setAuthCookies(res, tokens);
    res.status(204).end();
  } catch (err) {
    if (err instanceof AppError && err.status === 401) clearAuthCookies(res);
    throw err;
  }
}

export async function logout(req: Request, res: Response): Promise<void> {
  const token = readRefreshToken(req);
  if (token) await revokeSessionByToken(token);
  clearAuthCookies(res);
  res.status(204).end();
}

export async function me(req: Request, res: Response): Promise<void> {
  if (!req.auth) throw AppError.unauthorized();
  const user = await getCurrentUser(req.auth.userId);
  res.json({ user });
}
