import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../../app.js";
import { ActivationCodeModel } from "../activation-codes/activation-code.model.js";
import { issueActivationCode } from "../activation-codes/activation-code.service.js";
import { SessionModel } from "../auth/session.model.js";
import { UserModel } from "../auth/user.model.js";
import { MembershipModel } from "../memberships/membership.model.js";
import { BusinessModel } from "./business.model.js";

let replSet: MongoMemoryReplSet;
const app = createApp();

type WithHeaders = { headers: Record<string, unknown> };

function accessCookie(res: WithHeaders): string {
  const cookies = (res.headers["set-cookie"] ?? []) as string[];
  const found = cookies.find((c) => c.startsWith("bo_access="));
  if (!found) throw new Error("Cookie bo_access no encontrada");
  return found.split(";")[0]!;
}

async function signUp(email: string): Promise<string> {
  const res = await request(app)
    .post("/api/v1/auth/register")
    .send({ name: "Usuario", email, password: "una-clave-segura-123" });
  return accessCookie(res);
}

const newCode = async (trialDays = 0) =>
  (await issueActivationCode({ label: "Prueba", trialDays })).code;

/** Crea un negocio; si el body no trae código, emite uno nuevo y válido. */
async function createBiz(cookie: string, body: Record<string, unknown>) {
  const activationCode = "activationCode" in body ? body.activationCode : await newCode();
  return request(app)
    .post("/api/v1/businesses")
    .set("Cookie", cookie)
    .send({ ...body, activationCode });
}

beforeAll(async () => {
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(replSet.getUri());
  await UserModel.init();
  await SessionModel.init();
  await BusinessModel.init();
  await MembershipModel.init();
  await ActivationCodeModel.init();
});

afterAll(async () => {
  await mongoose.disconnect();
  await replSet.stop();
});

beforeEach(async () => {
  await UserModel.deleteMany({});
  await SessionModel.deleteMany({});
  await BusinessModel.deleteMany({});
  await MembershipModel.deleteMany({}).setOptions({ skipTenantCheck: true });
  await ActivationCodeModel.deleteMany({});
});

describe("POST /businesses", () => {
  it("crea el negocio y la membresía owner del creador", async () => {
    const cookie = await signUp("a@x.com");
    const res = await createBiz(cookie, { name: "Barbería Central", slug: "central" });

    expect(res.status).toBe(201);
    expect(res.body.business.slug).toBe("central");
    expect(res.body.business.role).toBe("owner");
    expect(res.body.business.currency).toBe("COP");
    expect(res.body.business.timezone).toBe("America/Bogota");
    expect(res.body.business.status).toBe("active");
    expect(res.body.business.access).toBe("ok");

    expect(await BusinessModel.countDocuments({})).toBe(1);
    const memberships = await MembershipModel.find({}).setOptions({ skipTenantCheck: true });
    expect(memberships).toHaveLength(1);
    expect(memberships[0]!.role).toBe("owner");
  });

  it("ignora un rol enviado en el body: el creador siempre es owner", async () => {
    const cookie = await signUp("a@x.com");
    const res = await createBiz(cookie, { name: "Barbería", slug: "central", role: "barber" });
    expect(res.status).toBe(201);
    expect(res.body.business.role).toBe("owner");
  });

  it("responde 409 si el slug ya existe, no deja datos a medias y no gasta el código", async () => {
    const cookieA = await signUp("a@x.com");
    const cookieB = await signUp("b@x.com");
    await createBiz(cookieA, { name: "Uno", slug: "central" });

    const code = await newCode();
    const res = await createBiz(cookieB, { name: "Dos", slug: "central", activationCode: code });
    expect(res.status).toBe(409);
    expect(await BusinessModel.countDocuments({})).toBe(1);
    expect(await MembershipModel.countDocuments({}).setOptions({ skipTenantCheck: true })).toBe(1);

    // El mismo código sirve al corregir el slug.
    const retry = await createBiz(cookieB, { name: "Dos", slug: "otra", activationCode: code });
    expect(retry.status).toBe(201);
  });

  it("responde 422 con slug reservado", async () => {
    const cookie = await signUp("a@x.com");
    const res = await createBiz(cookie, { name: "Barbería", slug: "login" });
    expect(res.status).toBe(422);
    expect(await BusinessModel.countDocuments({})).toBe(0);
  });

  it("responde 401 sin sesión", async () => {
    const res = await request(app)
      .post("/api/v1/businesses")
      .send({ name: "Barbería", slug: "central" });
    expect(res.status).toBe(401);
  });
});

describe("POST /businesses: código de activación", () => {
  it("sin código responde 422 y no crea nada", async () => {
    const cookie = await signUp("a@x.com");
    const res = await request(app)
      .post("/api/v1/businesses")
      .set("Cookie", cookie)
      .send({ name: "Barbería", slug: "central" });
    expect(res.status).toBe(422);
    expect(await BusinessModel.countDocuments({})).toBe(0);
  });

  it("con un código inexistente responde 422 INVALID_ACTIVATION_CODE", async () => {
    const cookie = await signUp("a@x.com");
    const res = await createBiz(cookie, {
      name: "Barbería",
      slug: "central",
      activationCode: "BRB-0000-0000-0000",
    });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("INVALID_ACTIVATION_CODE");
    expect(res.body.error.details[0].path).toBe("activationCode");
    expect(await BusinessModel.countDocuments({})).toBe(0);
  });

  it("un código solo sirve una vez", async () => {
    const cookie = await signUp("a@x.com");
    const code = await newCode();
    expect(
      (await createBiz(cookie, { name: "Uno", slug: "uno", activationCode: code })).status,
    ).toBe(201);

    const res = await createBiz(cookie, { name: "Dos", slug: "dos", activationCode: code });
    expect(res.status).toBe(422);
    expect(await BusinessModel.countDocuments({})).toBe(1);
  });

  it("con dos usos simultáneos del mismo código, solo uno gana", async () => {
    const cookieA = await signUp("a@x.com");
    const cookieB = await signUp("b@x.com");
    const code = await newCode();

    const results = await Promise.all([
      createBiz(cookieA, { name: "Uno", slug: "uno", activationCode: code }),
      createBiz(cookieB, { name: "Dos", slug: "dos", activationCode: code }),
    ]);

    expect(results.map((r) => r.status).sort()).toEqual([201, 422]);
    expect(await BusinessModel.countDocuments({})).toBe(1);
    expect(await MembershipModel.countDocuments({}).setOptions({ skipTenantCheck: true })).toBe(1);
  });

  it("un código con días de prueba crea el negocio en trial", async () => {
    const cookie = await signUp("a@x.com");
    const res = await createBiz(cookie, {
      name: "Barbería",
      slug: "central",
      activationCode: await newCode(15),
    });
    expect(res.status).toBe(201);
    expect(res.body.business.status).toBe("trial");
    expect(res.body.business.access).toBe("ok");

    const days = (Date.parse(res.body.business.trialEndsAt) - Date.now()) / 86_400_000;
    expect(days).toBeGreaterThan(14.9);
    expect(days).toBeLessThanOrEqual(15);
  });

  it("ignora status y trialEndsAt enviados en el body", async () => {
    const cookie = await signUp("a@x.com");
    const res = await createBiz(cookie, {
      name: "Barbería",
      slug: "central",
      status: "active",
      trialEndsAt: "2099-01-01",
      activationCode: await newCode(15),
    });
    expect(res.body.business.status).toBe("trial");
    expect(res.body.business.trialEndsAt.startsWith("2099")).toBe(false);
  });
});

describe("GET /me/businesses", () => {
  it("lista solo los negocios del usuario con su rol", async () => {
    const cookieA = await signUp("a@x.com");
    const cookieB = await signUp("b@x.com");
    await createBiz(cookieA, { name: "Negocio de A", slug: "negocio-a" });
    await createBiz(cookieB, { name: "Negocio de B", slug: "negocio-b" });

    const res = await request(app).get("/api/v1/me/businesses").set("Cookie", cookieA);
    expect(res.status).toBe(200);
    expect(res.body.businesses).toHaveLength(1);
    expect(res.body.businesses[0].slug).toBe("negocio-a");
    expect(res.body.businesses[0].role).toBe("owner");
  });

  it("incluye negocios suspendidos con su acceso para que el frontend lo muestre", async () => {
    const cookie = await signUp("a@x.com");
    await createBiz(cookie, { name: "Barbería", slug: "central" });
    await BusinessModel.updateMany({}, { status: "suspended" });

    const res = await request(app).get("/api/v1/me/businesses").set("Cookie", cookie);
    expect(res.body.businesses).toHaveLength(1);
    expect(res.body.businesses[0].access).toBe("suspended");
  });

  it("devuelve lista vacía si el usuario no tiene negocios", async () => {
    const cookie = await signUp("a@x.com");
    const res = await request(app).get("/api/v1/me/businesses").set("Cookie", cookie);
    expect(res.status).toBe(200);
    expect(res.body.businesses).toEqual([]);
  });

  it("no lista membresías suspendidas", async () => {
    const cookie = await signUp("a@x.com");
    await createBiz(cookie, { name: "Barbería", slug: "central" });
    await MembershipModel.updateMany({}, { status: "suspended" }).setOptions({
      skipTenantCheck: true,
    });

    const res = await request(app).get("/api/v1/me/businesses").set("Cookie", cookie);
    expect(res.body.businesses).toEqual([]);
  });

  it("responde 401 sin sesión", async () => {
    expect((await request(app).get("/api/v1/me/businesses")).status).toBe(401);
  });
});
