import express, { Router } from "express";
import mongoose, { Types } from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { errorHandler } from "../../shared/middleware/error-handler.js";
import { requestId } from "../../shared/middleware/request-id.js";
import { requirePermission } from "../../shared/middleware/require-permission.js";
import { BusinessModel } from "../businesses/business.model.js";
import { MembershipModel } from "./membership.model.js";
import { tenantContext } from "./tenant-context.middleware.js";

const USER_HEADER = "x-test-user-id";

function buildApp() {
  const app = express();
  app.use(requestId);
  // Sustituye a `authenticate`: aquí probamos tenantContext, no los JWT.
  app.use((req, _res, next) => {
    const userId = req.header(USER_HEADER);
    if (userId) req.auth = { userId };
    next();
  });

  const tenantRouter = Router({ mergeParams: true });
  tenantRouter.get("/whoami", (req, res) => {
    res.json({ tenant: req.tenant });
  });
  tenantRouter.post("/sales/void", requirePermission("sales:void"), (_req, res) => {
    res.json({ ok: true });
  });

  app.use("/businesses/:businessId", tenantContext, tenantRouter);
  app.use(errorHandler);
  return app;
}

let replSet: MongoMemoryReplSet;
const app = buildApp();

const userId = new Types.ObjectId().toString(); // owner en A, barbero en B
const outsiderId = new Types.ObjectId().toString(); // sin membresías
let shopA: string;
let shopB: string;
let ownerMembershipA: string;

beforeAll(async () => {
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(replSet.getUri());
  await BusinessModel.init();
  await MembershipModel.init();
});

afterAll(async () => {
  await mongoose.disconnect();
  await replSet.stop();
});

beforeEach(async () => {
  await BusinessModel.deleteMany({});
  await MembershipModel.deleteMany({}).setOptions({ skipTenantCheck: true });

  const base = { currency: "COP", timezone: "America/Bogota" } as const;
  const a = await BusinessModel.create({ ...base, name: "A", slug: "barberia-a" });
  const b = await BusinessModel.create({ ...base, name: "B", slug: "barberia-b" });
  shopA = a._id.toString();
  shopB = b._id.toString();

  const owner = await MembershipModel.create({ businessId: a._id, userId, role: "owner" });
  ownerMembershipA = owner._id.toString();
  await MembershipModel.create({ businessId: b._id, userId, role: "barber" });
});

const get = (path: string, asUser?: string) => {
  const req = request(app).get(path);
  return asUser ? req.set(USER_HEADER, asUser) : req;
};

const post = (path: string, asUser: string) => request(app).post(path).set(USER_HEADER, asUser);

describe("tenantContext", () => {
  it("construye req.tenant con la membresía leída de la base", async () => {
    const res = await get(`/businesses/${shopA}/whoami`, userId);
    expect(res.status).toBe(200);
    expect(res.body.tenant).toEqual({
      businessId: shopA,
      membershipId: ownerMembershipA,
      role: "owner",
    });
  });

  it("el mismo usuario tiene el rol que le corresponde en cada negocio", async () => {
    const res = await get(`/businesses/${shopB}/whoami`, userId);
    expect(res.status).toBe(200);
    expect(res.body.tenant.role).toBe("barber");
  });

  it("requirePermission usa el rol del negocio de la ruta", async () => {
    expect((await post(`/businesses/${shopA}/sales/void`, userId)).status).toBe(200);
    expect((await post(`/businesses/${shopB}/sales/void`, userId)).status).toBe(403);
  });

  it.each(["invited", "suspended"] as const)("membresía %s → 404", async (status) => {
    const memberId = new Types.ObjectId().toString();
    await MembershipModel.create({
      businessId: new Types.ObjectId(shopA),
      userId: memberId,
      role: "admin",
      status,
    });
    const res = await get(`/businesses/${shopA}/whoami`, memberId);
    expect(res.status).toBe(404);
  });

  it("negocio ajeno e inexistente responden exactamente igual", async () => {
    const foreign = await get(`/businesses/${shopA}/whoami`, outsiderId);
    const missing = await get(`/businesses/${new Types.ObjectId().toString()}/whoami`, userId);

    expect(foreign.status).toBe(404);
    expect(missing.status).toBe(404);
    expect(foreign.body.error.code).toBe("NOT_FOUND");
    expect(foreign.body.error.message).toBe(missing.body.error.message);
  });

  it.each(["no-es-un-id", "barberia-uno"])("id inválido %s → 404", async (badId) => {
    // "barberia-uno" tiene 12 caracteres: Types.ObjectId.isValid() lo aceptaría.
    const res = await get(`/businesses/${badId}/whoami`, userId);
    expect(res.status).toBe(404);
  });

  it("acepta el id en mayúsculas y lo normaliza a minúsculas", async () => {
    const res = await get(`/businesses/${shopA.toUpperCase()}/whoami`, userId);
    expect(res.status).toBe(200);
    expect(res.body.tenant.businessId).toBe(shopA);
  });

  it("sin autenticación responde 401 (falla cerrado)", async () => {
    const res = await get(`/businesses/${shopA}/whoami`);
    expect(res.status).toBe(401);
  });
});
