import { Types } from "mongoose";
import request from "supertest";
import { expect } from "vitest";
import type { MembershipStatus, Role } from "@barberos/contracts";
import { createApp } from "../src/app.js";
import { issueActivationCode } from "../src/modules/activation-codes/activation-code.service.js";
import { MembershipModel } from "../src/modules/memberships/membership.model.js";

export const app = createApp();

export interface Actor {
  cookie: string;
  userId: string;
}

type WithHeaders = { headers: Record<string, unknown> };

function accessCookie(res: WithHeaders): string {
  const cookies = (res.headers["set-cookie"] ?? []) as string[];
  const found = cookies.find((c) => c.startsWith("bo_access="));
  if (!found) throw new Error("Cookie bo_access no encontrada");
  return found.split(";")[0]!;
}

export async function signUp(email: string, name = "Usuario"): Promise<Actor> {
  const res = await request(app)
    .post("/api/v1/auth/register")
    .send({ name, email, password: "una-clave-segura-123" });
  expect(res.status).toBe(201);
  return { cookie: accessCookie(res), userId: res.body.user.id as string };
}

export async function createBusinessAs(owner: Actor, slug: string): Promise<string> {
  const { code } = await issueActivationCode({ label: "Prueba" });
  const res = await request(app)
    .post("/api/v1/businesses")
    .set("Cookie", owner.cookie)
    .send({ name: `Barbería ${slug}`, slug, activationCode: code });
  expect(res.status).toBe(201);
  return res.body.business.id as string;
}

export async function joinAs(
  businessId: string,
  email: string,
  role: Role,
  status: MembershipStatus = "active",
): Promise<Actor> {
  const actor = await signUp(email);
  await MembershipModel.create({
    businessId: new Types.ObjectId(businessId),
    userId: new Types.ObjectId(actor.userId),
    role,
    status,
  });
  return actor;
}

export const api = {
  get: (path: string, actor?: Actor) => {
    const req = request(app).get(`/api/v1${path}`);
    return actor ? req.set("Cookie", actor.cookie) : req;
  },
  post: (path: string, actor: Actor, body: object) =>
    request(app).post(`/api/v1${path}`).set("Cookie", actor.cookie).send(body),
  patch: (path: string, actor: Actor, body: object) =>
    request(app).patch(`/api/v1${path}`).set("Cookie", actor.cookie).send(body),
  delete: (path: string, actor: Actor) =>
    request(app).delete(`/api/v1${path}`).set("Cookie", actor.cookie),
};
