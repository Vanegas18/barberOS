import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import type { Role } from "@barberos/contracts";
import { errorHandler } from "./error-handler.js";
import { requestId } from "./request-id.js";
import { requirePermission } from "./require-permission.js";

function buildApp(role?: Role) {
  const app = express();
  app.use(requestId);
  app.use((req, _res, next) => {
    if (role) req.tenant = { businessId: "b1", membershipId: "m1", role };
    next();
  });
  app.post("/sales/void", requirePermission("sales:void"), (_req, res) => {
    res.json({ ok: true });
  });
  app.get("/sales", requirePermission("sales:read", "sales:create"), (_req, res) => {
    res.json({ ok: true });
  });
  app.use(errorHandler);
  return app;
}

describe("requirePermission", () => {
  it("permite al owner anular ventas", async () => {
    expect((await request(buildApp("owner")).post("/sales/void")).status).toBe(200);
  });

  it("niega al admin anular ventas", async () => {
    const res = await request(buildApp("admin")).post("/sales/void");
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("niega al barbero ver ventas", async () => {
    expect((await request(buildApp("barber")).get("/sales")).status).toBe(403);
  });

  it("permite el acceso si el rol tiene cualquiera de los permisos", async () => {
    expect((await request(buildApp("admin")).get("/sales")).status).toBe(200);
  });

  it("niega cuando no hay contexto de tenant (falla cerrado)", async () => {
    expect((await request(buildApp()).get("/sales")).status).toBe(403);
  });
});
