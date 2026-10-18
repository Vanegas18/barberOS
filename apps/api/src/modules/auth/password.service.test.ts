import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password.service.js";

describe("password.service", () => {
  it("genera un hash argon2id que no contiene la contraseña", async () => {
    const hash = await hashPassword("una-clave-segura-123");
    expect(hash.startsWith("$argon2id$")).toBe(true);
    expect(hash).not.toContain("una-clave-segura-123");
  });

  it("dos hashes de la misma contraseña son distintos (sal aleatoria)", async () => {
    const a = await hashPassword("una-clave-segura-123");
    const b = await hashPassword("una-clave-segura-123");
    expect(a).not.toBe(b);
  });

  it("verifica una contraseña correcta", async () => {
    const hash = await hashPassword("una-clave-segura-123");
    expect(await verifyPassword(hash, "una-clave-segura-123")).toBe(true);
  });

  it("rechaza una contraseña incorrecta", async () => {
    const hash = await hashPassword("una-clave-segura-123");
    expect(await verifyPassword(hash, "otra-clave-distinta")).toBe(false);
  });

  it("devuelve false ante un hash corrupto en vez de lanzar error", async () => {
    expect(await verifyPassword("esto-no-es-un-hash", "cualquiera")).toBe(false);
  });
});
