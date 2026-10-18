import jwt from "jsonwebtoken";
import { describe, expect, it } from "vitest";
import {
  generateRefreshToken,
  hashRefreshToken,
  signAccessToken,
  verifyAccessToken,
} from "./token.service.js";

describe("token.service", () => {
  it("firma y verifica un token de acceso", () => {
    const token = signAccessToken("user-123");
    expect(verifyAccessToken(token)).toBe("user-123");
  });

  it("rechaza un token manipulado", () => {
    const token = signAccessToken("user-123");
    expect(verifyAccessToken(token.slice(0, -2) + "xx")).toBeNull();
  });

  it("rechaza un token firmado con otro secreto", () => {
    const forged = jwt.sign({ sub: "user-123" }, "otro-secreto-distinto-de-32-caracteres!!");
    expect(verifyAccessToken(forged)).toBeNull();
  });

  it("rechaza un token expirado", () => {
    const expired = jwt.sign({ sub: "user-123" }, process.env.JWT_ACCESS_SECRET!, {
      expiresIn: -10,
    });
    expect(verifyAccessToken(expired)).toBeNull();
  });

  it("rechaza basura", () => {
    expect(verifyAccessToken("no-es-un-jwt")).toBeNull();
  });

  it("genera refresh tokens únicos y largos", () => {
    const a = generateRefreshToken();
    const b = generateRefreshToken();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThanOrEqual(43);
  });

  it("el hash del refresh token es determinista y distinto del token", () => {
    const token = generateRefreshToken();
    expect(hashRefreshToken(token)).toBe(hashRefreshToken(token));
    expect(hashRefreshToken(token)).not.toBe(token);
  });
});
