import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { useTestDatabase } from "../../../tests/db.js";
import { createApp } from "../../app.js";
import { SessionModel } from "./session.model.js";
import { UserModel } from "./user.model.js";

const app = createApp();

const validBody = {
  name: "Juan Pérez",
  email: "Juan@Ejemplo.com",
  password: "una-clave-segura-123",
};

useTestDatabase();

beforeEach(async () => {
  await UserModel.deleteMany({});
  await SessionModel.deleteMany({});
});

describe("POST /api/v1/auth/register", () => {
  it("registra un usuario y responde 201 con cookies httpOnly", async () => {
    const res = await request(app).post("/api/v1/auth/register").send(validBody);

    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe("juan@ejemplo.com");
    expect(res.body.user.id).toBeTypeOf("string");

    const cookies = res.headers["set-cookie"] as unknown as string[];
    expect(cookies).toHaveLength(3);
    expect(cookies.every((c) => c.includes("HttpOnly"))).toBe(true);
    expect(cookies.some((c) => c.startsWith("bo_access="))).toBe(true);
    expect(
      cookies.some((c) => c.startsWith("bo_refresh=") && c.includes("Path=/api/v1/auth")),
    ).toBe(true);
    expect(cookies.some((c) => c.startsWith("bo_session=1") && c.includes("Path=/"))).toBe(true);
  });

  it("no devuelve la contraseña ni su hash en la respuesta", async () => {
    const res = await request(app).post("/api/v1/auth/register").send(validBody);
    const text = JSON.stringify(res.body);
    expect(text).not.toContain("passwordHash");
    expect(text).not.toContain("una-clave-segura-123");
  });

  it("guarda la contraseña hasheada con argon2id", async () => {
    await request(app).post("/api/v1/auth/register").send(validBody);
    const user = await UserModel.findOne({ email: "juan@ejemplo.com" }).select("+passwordHash");
    expect(user?.passwordHash.startsWith("$argon2id$")).toBe(true);
  });

  it("guarda solo el hash del refresh token, no el token", async () => {
    const res = await request(app).post("/api/v1/auth/register").send(validBody);
    const cookies = res.headers["set-cookie"] as unknown as string[];
    const refreshCookie = cookies.find((c) => c.startsWith("bo_refresh="))!;
    const token = refreshCookie.split(";")[0]!.split("=")[1]!;

    const session = await SessionModel.findOne({});
    expect(session).not.toBeNull();
    expect(session!.refreshTokenHash).not.toBe(token);
    expect(session!.refreshTokenHash).toHaveLength(64);
  });

  it("responde 409 con mensaje genérico si el email ya existe (sin importar mayúsculas)", async () => {
    await request(app).post("/api/v1/auth/register").send(validBody);
    const res = await request(app)
      .post("/api/v1/auth/register")
      .send({ ...validBody, email: "JUAN@ejemplo.com" });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("CONFLICT");
    expect(res.body.error.message).toBe("No se pudo completar el registro");
    expect(await UserModel.countDocuments({})).toBe(1);
  });

  it("responde 422 con contraseña corta", async () => {
    const res = await request(app)
      .post("/api/v1/auth/register")
      .send({ ...validBody, password: "corta" });
    expect(res.status).toBe(422);
    expect(await UserModel.countDocuments({})).toBe(0);
  });

  it("responde 422 con email inválido", async () => {
    const res = await request(app)
      .post("/api/v1/auth/register")
      .send({ ...validBody, email: "no-es-email" });
    expect(res.status).toBe(422);
  });

  it("ignora campos desconocidos como status o role", async () => {
    const res = await request(app)
      .post("/api/v1/auth/register")
      .send({ ...validBody, status: "disabled", role: "owner" });
    expect(res.status).toBe(201);
    const user = await UserModel.findOne({ email: "juan@ejemplo.com" });
    expect(user?.status).toBe("active");
  });
});
