import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../../app.js";
import { SessionModel } from "./session.model.js";
import { UserModel } from "./user.model.js";

let replSet: MongoMemoryReplSet;
const app = createApp();

const credentials = {
  name: "Juan Pérez",
  email: "juan@ejemplo.com",
  password: "una-clave-segura-123",
};

type WithHeaders = { headers: Record<string, unknown> };

/** Devuelve "nombre=valor" de una cookie Set-Cookie, listo para reenviar en el header Cookie. */
function cookiePair(res: WithHeaders, name: string): string {
  const cookies = (res.headers["set-cookie"] ?? []) as string[];
  const found = cookies.find((c) => c.startsWith(`${name}=`));
  if (!found) throw new Error(`Cookie ${name} no encontrada`);
  return found.split(";")[0]!;
}

const signUp = () => request(app).post("/api/v1/auth/register").send(credentials);
const login = (body: object) => request(app).post("/api/v1/auth/login").send(body);
const refreshWith = (cookie: string) =>
  request(app).post("/api/v1/auth/refresh").set("Cookie", cookie);

beforeAll(async () => {
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(replSet.getUri());
  await UserModel.init();
  await SessionModel.init();
});

afterAll(async () => {
  await mongoose.disconnect();
  await replSet.stop();
});

beforeEach(async () => {
  await UserModel.deleteMany({});
  await SessionModel.deleteMany({});
});

describe("POST /auth/login", () => {
  it("inicia sesión, sin importar mayúsculas del email, y crea una sesión nueva", async () => {
    await signUp();
    const res = await login({ email: "JUAN@Ejemplo.com", password: credentials.password });

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe("juan@ejemplo.com");
    expect(() => cookiePair(res, "bo_access")).not.toThrow();
    expect(() => cookiePair(res, "bo_refresh")).not.toThrow();
    expect(await SessionModel.countDocuments({})).toBe(2);
  });

  it("responde 401 con contraseña incorrecta", async () => {
    await signUp();
    const res = await login({ email: credentials.email, password: "otra-clave-incorrecta" });
    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe("Credenciales inválidas");
  });

  it("da la misma respuesta para email inexistente y contraseña incorrecta", async () => {
    await signUp();
    const wrongPassword = await login({
      email: credentials.email,
      password: "otra-clave-incorrecta",
    });
    const unknownEmail = await login({
      email: "nadie@ejemplo.com",
      password: credentials.password,
    });

    expect(unknownEmail.status).toBe(wrongPassword.status);
    expect(unknownEmail.body.error.code).toBe(wrongPassword.body.error.code);
    expect(unknownEmail.body.error.message).toBe(wrongPassword.body.error.message);
  });

  it("responde 401 igual si el usuario está deshabilitado", async () => {
    await signUp();
    await UserModel.updateOne({ email: credentials.email }, { status: "disabled" });
    const res = await login({ email: credentials.email, password: credentials.password });
    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe("Credenciales inválidas");
  });
});

describe("POST /auth/refresh", () => {
  it("rota el token: emite uno nuevo y revoca el anterior", async () => {
    const reg = await signUp();
    const oldRefresh = cookiePair(reg, "bo_refresh");

    const res = await refreshWith(oldRefresh);
    expect(res.status).toBe(204);
    expect(() => cookiePair(res, "bo_access")).not.toThrow();
    expect(cookiePair(res, "bo_refresh")).not.toBe(oldRefresh);

    expect(await SessionModel.countDocuments({ revokedAt: { $exists: true } })).toBe(1);
    expect(await SessionModel.countDocuments({ revokedAt: { $exists: false } })).toBe(1);
  });

  it("detecta la reutilización de un token rotado y revoca todas las sesiones", async () => {
    const reg = await signUp();
    const oldRefresh = cookiePair(reg, "bo_refresh");

    const first = await refreshWith(oldRefresh);
    const newRefresh = cookiePair(first, "bo_refresh");

    const replay = await refreshWith(oldRefresh);
    expect(replay.status).toBe(401);

    // El token nuevo, que era legítimo, también queda inutilizado.
    const afterReplay = await refreshWith(newRefresh);
    expect(afterReplay.status).toBe(401);
    expect(await SessionModel.countDocuments({ revokedAt: { $exists: false } })).toBe(0);
  });

  it("responde 401 sin cookie de refresh", async () => {
    const res = await request(app).post("/api/v1/auth/refresh");
    expect(res.status).toBe(401);
  });

  it("responde 401 con un token inventado", async () => {
    const res = await refreshWith("bo_refresh=token-inventado");
    expect(res.status).toBe(401);
  });
});

describe("POST /auth/logout", () => {
  it("revoca la sesión y borra las cookies", async () => {
    const reg = await signUp();
    const refreshCookie = cookiePair(reg, "bo_refresh");

    const out = await request(app).post("/api/v1/auth/logout").set("Cookie", refreshCookie);
    expect(out.status).toBe(204);
    const cleared = out.headers["set-cookie"] as unknown as string[];
    expect(cleared.some((c) => c.startsWith("bo_refresh=;"))).toBe(true);

    expect((await refreshWith(refreshCookie)).status).toBe(401);
  });

  it("responde 204 aunque no haya sesión", async () => {
    const res = await request(app).post("/api/v1/auth/logout");
    expect(res.status).toBe(204);
  });
});

describe("GET /auth/me", () => {
  it("devuelve el usuario autenticado sin datos sensibles", async () => {
    const reg = await signUp();
    const res = await request(app)
      .get("/api/v1/auth/me")
      .set("Cookie", cookiePair(reg, "bo_access"));

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe("juan@ejemplo.com");
    expect(JSON.stringify(res.body)).not.toContain("passwordHash");
  });

  it("responde 401 sin cookie", async () => {
    expect((await request(app).get("/api/v1/auth/me")).status).toBe(401);
  });

  it("responde 401 con un token de acceso falso", async () => {
    const res = await request(app).get("/api/v1/auth/me").set("Cookie", "bo_access=falso");
    expect(res.status).toBe(401);
  });

  it("responde 401 si el usuario fue deshabilitado, aunque el token siga vigente", async () => {
    const reg = await signUp();
    await UserModel.updateOne({ email: credentials.email }, { status: "disabled" });
    const res = await request(app)
      .get("/api/v1/auth/me")
      .set("Cookie", cookiePair(reg, "bo_access"));
    expect(res.status).toBe(401);
  });
});
