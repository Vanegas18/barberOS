import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { useTestDatabase } from "../../../tests/db.js";
import { api, app, createBusinessAs, joinAs, signUp, type Actor } from "../../../tests/actors.js";
import { EmployeeModel } from "../employees/employee.model.js";
import { MembershipModel } from "../memberships/membership.model.js";
import { InvitationModel } from "./invitation.model.js";
import { hashInvitationToken } from "./invitation.service.js";

useTestDatabase();

let owner: Actor;
let admin: Actor;
let barber: Actor;
let bizId: string;
let carlosId: string;
const inv = (suffix = "") => `/businesses/${bizId}/invitations${suffix}`;

const preview = (token: string) => request(app).get(`/api/v1/invitations/${token}`);
const accept = (token: string, actor?: Actor) => {
  const req = request(app).post(`/api/v1/invitations/${token}/accept`);
  return actor ? req.set("Cookie", actor.cookie) : req;
};

async function inviteCarlos(by: Actor = owner): Promise<string> {
  const res = await api.post(inv(), by, { role: "barber", employeeId: carlosId });
  expect(res.status).toBe(201);
  return res.body.token as string;
}

beforeEach(async () => {
  const db = InvitationModel.db;
  await Promise.all(Object.values(db.collections).map((c) => c.deleteMany({})));

  owner = await signUp("dueno@ejemplo.com");
  bizId = await createBusinessAs(owner, "barberia-invita");
  admin = await joinAs(bizId, "admin@ejemplo.com", "admin");
  barber = await joinAs(bizId, "barbero@ejemplo.com", "barber");

  const carlos = await api.post(`/businesses/${bizId}/employees`, owner, {
    displayName: "Carlos",
    earningRule: { type: "percentage", rateBp: 5000 },
  });
  carlosId = carlos.body.employee.id as string;
});

describe("crear invitaciones", () => {
  it("el owner invita a un barbero ya creado en Equipo", async () => {
    const res = await api.post(inv(), owner, { role: "barber", employeeId: carlosId });

    expect(res.status).toBe(201);
    expect(res.body.invitation).toMatchObject({
      role: "barber",
      employeeId: carlosId,
      employeeName: "Carlos",
      status: "pending",
    });
    expect(res.body.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(res.body.inviteUrl).toBe(`http://localhost:3000/invitacion/${res.body.token}`);

    const days = (Date.parse(res.body.invitation.expiresAt) - Date.now()) / 86_400_000;
    expect(days).toBeGreaterThan(6.9);
    expect(days).toBeLessThanOrEqual(7);
  });

  it("guarda solo el hash del token", async () => {
    const token = await inviteCarlos();
    const doc = await InvitationModel.findOne({ businessId: bizId }).lean();
    expect(doc?.tokenHash).toBe(hashInvitationToken(token));
    expect(JSON.stringify(doc)).not.toContain(token);
  });

  it("invitar a un barbero exige el empleado (422)", async () => {
    const res = await api.post(inv(), owner, { role: "barber" });
    expect(res.status).toBe(422);
    expect(res.body.error.details[0].path).toBe("employeeId");
  });

  it("el owner invita un admin, con o sin empleado", async () => {
    const res = await api.post(inv(), owner, { role: "admin" });
    expect(res.status).toBe(201);
    expect(res.body.invitation.employeeId).toBeNull();
  });

  it("el admin invita barberos, pero no admins (403)", async () => {
    const ok = await api.post(inv(), admin, { role: "barber", employeeId: carlosId });
    expect(ok.status).toBe(201);

    const denied = await api.post(inv(), admin, { role: "admin" });
    expect(denied.status).toBe(403);
  });

  it("el barbero no invita a nadie (403)", async () => {
    const res = await api.post(inv(), barber, { role: "barber", employeeId: carlosId });
    expect(res.status).toBe(403);
  });

  it("no se puede invitar como owner (422)", async () => {
    const res = await api.post(inv(), owner, { role: "owner" });
    expect(res.status).toBe(422);
  });

  it("un empleado que ya tiene cuenta no se invita (409)", async () => {
    const juan = await api.post(`/businesses/${bizId}/employees`, owner, {
      displayName: "Juan",
      linkSelf: true,
    });
    const res = await api.post(inv(), owner, { role: "barber", employeeId: juan.body.employee.id });
    expect(res.status).toBe(409);
  });

  it("un empleado desactivado no se invita (409)", async () => {
    await api.patch(`/businesses/${bizId}/employees/${carlosId}`, owner, { active: false });
    const res = await api.post(inv(), owner, { role: "barber", employeeId: carlosId });
    expect(res.status).toBe(409);
  });

  it("lista las pendientes y vigentes, y permite revocar", async () => {
    await inviteCarlos();
    const list = await api.get(inv(), owner);
    expect(list.body.invitations).toHaveLength(1);

    const id = list.body.invitations[0].id as string;
    const revoked = await api.post(inv(`/${id}/revoke`), owner, {});
    expect(revoked.status).toBe(204);
    expect((await api.get(inv(), owner)).body.invitations).toHaveLength(0);
  });

  it("el admin no revoca una invitación de admin (403)", async () => {
    const created = await api.post(inv(), owner, { role: "admin" });
    const res = await api.post(inv(`/${created.body.invitation.id}/revoke`), admin, {});
    expect(res.status).toBe(403);
  });
});

describe("ver la invitación (sin sesión)", () => {
  it("muestra el negocio, el rol y el nombre del empleado", async () => {
    const token = await inviteCarlos();
    const res = await preview(token);
    expect(res.status).toBe(200);
    expect(res.body.invitation).toMatchObject({
      businessName: "Barbería barberia-invita",
      role: "barber",
      employeeName: "Carlos",
    });
  });

  it("un token inexistente responde 404 INVITATION_INVALID; uno mal formado, 422", async () => {
    const unknown = await preview("a".repeat(43));
    expect(unknown.status).toBe(404);
    expect(unknown.body.error.code).toBe("INVITATION_INVALID");

    const malformed = await preview("corto");
    expect(malformed.status).toBe(422);
  });
});

describe("aceptar la invitación", () => {
  it("una cuenta nueva acepta, queda como barbero y vinculada a su ficha", async () => {
    const token = await inviteCarlos();
    const carlos = await signUp("carlos@ejemplo.com", "Carlos Pérez");

    const res = await accept(token, carlos);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ businessId: bizId, slug: "barberia-invita", role: "barber" });

    const mine = await api.get("/me/businesses", carlos);
    expect(mine.body.businesses).toEqual([expect.objectContaining({ id: bizId, role: "barber" })]);

    const me = await api.get(`/businesses/${bizId}/employees/me`, carlos);
    expect(me.status).toBe(200);
    expect(me.body.employee).toMatchObject({
      id: carlosId,
      hasAccount: true,
      earningRule: { type: "percentage", rateBp: 5000 },
    });

    const doc = await InvitationModel.findOne({ businessId: bizId }).lean();
    expect(doc?.status).toBe("accepted");
    expect(doc?.acceptedByUserId?.toString()).toBe(carlos.userId);
  });

  it("es de un solo uso", async () => {
    const token = await inviteCarlos();
    expect((await accept(token, await signUp("carlos@ejemplo.com"))).status).toBe(200);

    const second = await accept(token, await signUp("intruso@ejemplo.com"));
    expect(second.status).toBe(404);
    expect((await preview(token)).status).toBe(404);
  });

  it("con dos aceptaciones simultáneas, solo una gana", async () => {
    const token = await inviteCarlos();
    const [a, b] = await Promise.all([signUp("uno@ejemplo.com"), signUp("dos@ejemplo.com")]);
    const results = await Promise.all([accept(token, a), accept(token, b)]);

    expect(results.map((r) => r.status).sort()).toEqual([200, 404]);
    expect(await MembershipModel.countDocuments({ businessId: bizId, role: "barber" })).toBe(2);
  });

  it("vencida no sirve", async () => {
    const token = await inviteCarlos();
    await InvitationModel.updateOne(
      { businessId: bizId },
      { $set: { expiresAt: new Date(Date.now() - 1000) } },
    );
    expect((await preview(token)).status).toBe(404);
    expect((await accept(token, await signUp("carlos@ejemplo.com"))).status).toBe(404);
  });

  it("revocada no sirve", async () => {
    const token = await inviteCarlos();
    const list = await api.get(inv(), owner);
    await api.post(inv(`/${list.body.invitations[0].id}/revoke`), owner, {});
    expect((await accept(token, await signUp("carlos@ejemplo.com"))).status).toBe(404);
  });

  it("quien ya es miembro recibe 409 y la invitación sigue pendiente", async () => {
    const token = await inviteCarlos();
    const res = await accept(token, barber);

    expect(res.status).toBe(409);
    const doc = await InvitationModel.findOne({ businessId: bizId }).lean();
    expect(doc?.status).toBe("pending");
    const employee = await EmployeeModel.findOne({ businessId: bizId, _id: carlosId }).lean();
    expect(employee?.membershipId).toBeNull();
  });

  it("si el empleado se vinculó por otra invitación, la segunda falla sin dejar membresía", async () => {
    const first = await inviteCarlos();
    const second = await inviteCarlos();
    await accept(first, await signUp("carlos@ejemplo.com"));

    const other = await signUp("otro@ejemplo.com");
    const res = await accept(second, other);

    expect(res.status).toBe(409);
    expect(await MembershipModel.countDocuments({ businessId: bizId, userId: other.userId })).toBe(
      0,
    );
    const doc = await InvitationModel.findOne({
      businessId: bizId,
      tokenHash: hashInvitationToken(second),
    }).lean();
    expect(doc?.status).toBe("pending");
  });

  it("un admin invitado sin empleado entra como admin", async () => {
    const created = await api.post(inv(), owner, { role: "admin" });
    const nuevo = await signUp("nuevo-admin@ejemplo.com");
    const res = await accept(created.body.token, nuevo);
    expect(res.body.role).toBe("admin");

    const team = await api.get(`/businesses/${bizId}/employees`, nuevo);
    expect(team.status).toBe(200);
  });

  it("aceptar exige sesión (401)", async () => {
    const token = await inviteCarlos();
    expect((await accept(token)).status).toBe(401);
  });
});

describe("Aislamiento entre negocios", () => {
  it("otro negocio no lista ni revoca invitaciones ajenas, ni invita empleados ajenos", async () => {
    await inviteCarlos();
    const other = await signUp("otro-dueno@ejemplo.com");
    const otherBiz = await createBusinessAs(other, "barberia-ajena");
    const id = (await api.get(inv(), owner)).body.invitations[0].id as string;

    const list = await api.get(`/businesses/${otherBiz}/invitations`, other);
    expect(list.body.invitations).toEqual([]);

    const revoke = await api.post(`/businesses/${otherBiz}/invitations/${id}/revoke`, other, {});
    expect(revoke.status).toBe(404);

    const steal = await api.post(`/businesses/${otherBiz}/invitations`, other, {
      role: "barber",
      employeeId: carlosId,
    });
    expect(steal.status).toBe(404);
  });
});
