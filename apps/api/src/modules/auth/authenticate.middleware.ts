import type { NextFunction, Request, Response } from "express";
import { AppError } from "../../shared/errors/app-error.js";
import { ACCESS_COOKIE } from "./auth.cookies.js";
import { verifyAccessToken } from "./token.service.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: { userId: string };
    }
  }
}

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const token: unknown = req.cookies?.[ACCESS_COOKIE];
  if (typeof token !== "string" || token.length === 0) return next(AppError.unauthorized());

  const userId = verifyAccessToken(token);
  if (!userId) return next(AppError.unauthorized());

  req.auth = { userId };
  next();
}
