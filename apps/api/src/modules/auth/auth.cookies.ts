import type { CookieOptions, Response } from "express";
import { env } from "../../config/env.js";
import { ACCESS_TOKEN_TTL_SECONDS } from "./token.service.js";
import type { IssuedTokens } from "./session.service.js";

export const ACCESS_COOKIE = "bo_access";
export const REFRESH_COOKIE = "bo_refresh";
export const REFRESH_COOKIE_PATH = "/api/v1/auth";

const baseOptions: CookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "lax",
};

export function setAuthCookies(res: Response, tokens: IssuedTokens): void {
  res.cookie(ACCESS_COOKIE, tokens.accessToken, {
    ...baseOptions,
    path: "/",
    maxAge: ACCESS_TOKEN_TTL_SECONDS * 1000,
  });
  res.cookie(REFRESH_COOKIE, tokens.refreshToken, {
    ...baseOptions,
    path: REFRESH_COOKIE_PATH,
    expires: tokens.refreshExpiresAt,
  });
}

export function clearAuthCookies(res: Response): void {
  res.clearCookie(ACCESS_COOKIE, { ...baseOptions, path: "/" });
  res.clearCookie(REFRESH_COOKIE, { ...baseOptions, path: REFRESH_COOKIE_PATH });
}
