import mongoose, { Types } from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { MembershipStatus, Role } from "@barberos/contracts";
import { createApp } from "./app.js";
import { SessionModel } from "./modules/auth/session.model.js";
import { UserModel } from "./modules/auth/user.model.js";
import { BusinessModel } from "./modules/businesses/business.model.js";
import { MembershipModel } from "./modules/memberships/membership.model.js";

let replSet: MongoMemoryReplSet;
const app = createApp();

type WithHeaders = { headers: Record<string, unknown> };
interface Actor {
  cookie: string;
  userId: string;
}

function accessCookie(res: WithHeaders): string {
  const cookies = (res.headers["set-cookie"] ?? []) as string[];
  const found = cookies.find((c) => c.startsWith("bo_access="));
  if (!found) throw new Error("Cookie bo_access no encontrada");
  return found.split(";")[0]!;
}

async function signUp(email: string): Promise<Actor> {
  const res = await request(app)
    .post("/api/v1/auth/register")
    .send({ name: "Usuario", email, password: "una-clave-segura-123" });
  expect(res.status).toBe(201);
  return { cookie: accessCookie(res), userId: res.body.user.id as string };
}

async function createBusinessAs(actor: Actor, slug: string): Promise<string> {
  const res = await request(app)
    .post("/api/v1/businesses")
    .set("Cookie", actor.cookie)
    .send({ name: `Barbería ${slug}`, slug });
  expect(res.status).toBe(201);
  return res.body.business.id as string;
}

async function addMember(
  businessId: string,
  userId: string,
  role: Role,
  status: MembershipStatus = "active",
) {
  return MembershipModel.create({
    businessId: new Types.ObjectId(businessId),
    userId: new Types.ObjectId(userId),
    role,
    status,
  });
}

const api = {
  get: (path: string, actor?: Actor) => {
    const req = request(app).get(`/api/v1${path}`);
    return actor ? req.set("Cookie", actor.cookie) : req;
  },
  patch: (path: string, actor: Actor, body: object) =>
    request(app).patch(`/api/v1${path}`).set("Cookie", actor.cookie).send(body),
};

let ana: Actor;
let beto: Actor;
let anaBiz: string;
let betoBiz: string;

beforeAll(async () => {
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(replSet.getUri());
  await UserModel.init();
  await SessionModel.init();
  await BusinessModel.init();
  await MembershipModel.init();
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

  ana = await signUp("ana@ejemplo.com");
  beto = await signUp("beto@ejemplo.com");
  anaBiz = await createBusinessAs(ana, "barberia-ana");
  betoBiz = await createBusinessAs(beto, "barberia-beto");
});

describe("Aislamiento entre negocios", () => {
  it("cada owner ve su propio negocio", async () => {
    const res = await api.get(`/businesses/${anaBiz}`, ana);
    expect(res.status).toBe(200);
    expect(res.body.business).toMatchObject({ id: anaBiz, slug: "barberia-ana", role: "owner" });
  });

  it("A no puede leer el negocio de B, y la respuesta es igual a uno inexistente", async () => {
    const foreign = await api.get(`/businesses/${betoBiz}`, ana);
    const missing = await api.get(`/businesses/${new Types.ObjectId().toString()}`, ana);

    expect(foreign.status).toBe(404);
    expect(foreign.body.error.code).toBe("NOT_FOUND");
    expect(foreign.body.error.message).toBe(missing.body.error.message);
    expect(JSON.stringify(foreign.body)).not.toContain("barberia-beto");
  });

  it("A no puede modificar el negocio de B", async () => {
    const res = await api.patch(`/businesses/${betoBiz}`, ana, { name: "Hackeado" });
    expect(res.status).toBe(404);

    const betoDoc = await BusinessModel.findById(betoBiz).lean();
    expect(betoDoc?.name).toBe("Barbería barberia-beto");
  });

  it("un businessId falso en el body se ignora", async () => {
    const res = await api.patch(`/businesses/${anaBiz}`, ana, {
      name: "Ana Renovada",
      businessId: betoBiz,
      slug: "robado",
      currency: "USD",
    });

    expect(res.status).toBe(200);
    expect(res.body.business).toMatchObject({
      id: anaBiz,
      name: "Ana Renovada",
      slug: "barberia-ana",
      currency: "COP",
    });
    const betoDoc = await BusinessModel.findById(betoBiz).lean();
    expect(betoDoc?.name).toBe("Barbería barberia-beto");
  });

  it("un body con solo campos desconocidos se rechaza con 422", async () => {
    const res = await api.patch(`/businesses/${anaBiz}`, ana, { businessId: betoBiz });
    expect(res.status).toBe(422);
  });

  it("sin sesión responde 401", async () => {
    expect((await api.get(`/businesses/${anaBiz}`)).status).toBe(401);
  });

  it("/me/businesses solo lista los negocios propios", async () => {
    const res = await api.get("/me/businesses", ana);
    expect(res.status).toBe(200);
    expect(res.body.businesses.map((b: { slug: string }) => b.slug)).toEqual(["barberia-ana"]);
  });
});

describe("Roles dentro de un negocio", () => {
  it.each(["admin", "barber"] as const)(
    "%s puede leer el negocio pero no editarlo",
    async (role) => {
      await addMember(anaBiz, beto.userId, role);

      const read = await api.get(`/businesses/${anaBiz}`, beto);
      expect(read.status).toBe(200);
      expect(read.body.business.role).toBe(role);

      const write = await api.patch(`/businesses/${anaBiz}`, beto, { name: "Intento" });
      expect(write.status).toBe(403);
    },
  );

  it("suspender una membresía corta el acceso de inmediato con el mismo token", async () => {
    const membership = await addMember(anaBiz, beto.userId, "admin");
    expect((await api.get(`/businesses/${anaBiz}`, beto)).status).toBe(200);

    await MembershipModel.updateOne(
      { businessId: membership.businessId, _id: membership._id },
      { $set: { status: "suspended" } },
    );

    expect((await api.get(`/businesses/${anaBiz}`, beto)).status).toBe(404);
  });
});

describe("Red de seguridad del tenantPlugin", () => {
  it("rechaza una consulta de membresías sin businessId", async () => {
    await expect(
      MembershipModel.find({ userId: new Types.ObjectId(ana.userId) }).exec(),
    ).rejects.toThrow();
  });
});
