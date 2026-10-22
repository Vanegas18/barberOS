import { DEFAULT_WEEKLY_SCHEDULE } from "@barberos/contracts";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { useTestDatabase } from "../../../tests/db.js";
import { api, app, createBusinessAs, joinAs, signUp, type Actor } from "../../../tests/actors.js";
import { EmployeeModel } from "../employees/employee.model.js";
import { ScheduleExceptionModel } from "./schedule-exception.model.js";

useTestDatabase();

const put = (path: string, actor: Actor, body: object) =>
  request(app).put(`/api/v1${path}`).set("Cookie", actor.cookie).send(body);

const quincena = {
  workday: { start: "09:00", end: "21:00", lunch: { start: "14:00", durationMinutes: 120 } },
  note: "Quincena",
};
const october = "/exceptions?from=2026-10-01&to=2026-10-31";

let owner: Actor;
let admin: Actor;
let barber: Actor;
let bizId: string;
let carlosId: string;
let barberEmployeeId: string;
const emp = (id: string, suffix: string) => `/businesses/${bizId}/employees/${id}${suffix}`;

beforeEach(async () => {
  const db = EmployeeModel.db;
  await Promise.all(Object.values(db.collections).map((c) => c.deleteMany({})));

  owner = await signUp("dueno@ejemplo.com");
  bizId = await createBusinessAs(owner, "barberia-horarios");
  admin = await joinAs(bizId, "admin@ejemplo.com", "admin");
  barber = await joinAs(bizId, "barbero@ejemplo.com", "barber");

  const carlos = await api.post(`/businesses/${bizId}/employees`, owner, { displayName: "Carlos" });
  carlosId = carlos.body.employee.id as string;

  // El barbero con cuenta se vincula directo en la base hasta tener invitaciones (2.4).
  const membership = await db.collection("memberships").findOne({ role: "barber" });
  const created = await EmployeeModel.create({
    businessId: bizId,
    displayName: "Andrés",
    nameKey: "andres",
    membershipId: membership!._id,
  });
  barberEmployeeId = created._id.toString();
});

describe("semana tipo", () => {
  it("un empleado nuevo arranca con el horario base", async () => {
    const res = await api.get(`/businesses/${bizId}/employees/${carlosId}`, owner);
    expect(res.body.employee.weeklySchedule).toEqual(DEFAULT_WEEKLY_SCHEDULE);
  });

  it("se puede crear con su propio horario", async () => {
    const weeklySchedule = { ...DEFAULT_WEEKLY_SCHEDULE, monday: null };
    const res = await api.post(`/businesses/${bizId}/employees`, owner, {
      displayName: "Beto",
      weeklySchedule,
    });
    expect(res.status).toBe(201);
    expect(res.body.employee.weeklySchedule.monday).toBeNull();
  });

  it("el admin reemplaza la semana completa", async () => {
    const weeklySchedule = {
      ...DEFAULT_WEEKLY_SCHEDULE,
      tuesday: null,
      saturday: { start: "08:00", end: "20:00", lunch: null },
    };
    const res = await put(emp(carlosId, "/schedule"), admin, weeklySchedule);
    expect(res.status).toBe(200);
    expect(res.body.employee.weeklySchedule).toEqual(weeklySchedule);
  });

  it("exige los siete días (422)", async () => {
    const sixDays = Object.fromEntries(
      Object.entries(DEFAULT_WEEKLY_SCHEDULE).filter(([day]) => day !== "sunday"),
    );
    const res = await put(emp(carlosId, "/schedule"), owner, sixDays);
    expect(res.status).toBe(422);
  });

  it("rechaza horas fuera del paso de 5 minutos (422)", async () => {
    const res = await put(emp(carlosId, "/schedule"), owner, {
      ...DEFAULT_WEEKLY_SCHEDULE,
      monday: { start: "09:07", end: "19:00", lunch: null },
    });
    expect(res.status).toBe(422);
    expect(res.body.error.details[0].path).toBe("monday.start");
  });

  it("el barbero no cambia horarios, ni el suyo (403)", async () => {
    const res = await put(emp(barberEmployeeId, "/schedule"), barber, DEFAULT_WEEKLY_SCHEDULE);
    expect(res.status).toBe(403);
  });

  it("el barbero ve su propio horario en /employees/me", async () => {
    const res = await api.get(`/businesses/${bizId}/employees/me`, barber);
    expect(res.status).toBe(200);
    expect(res.body.employee.weeklySchedule).toEqual(DEFAULT_WEEKLY_SCHEDULE);
  });
});

describe("excepciones por día", () => {
  it("marca un día libre y lo lista", async () => {
    const res = await put(emp(carlosId, "/exceptions/2026-10-30"), owner, {
      workday: null,
      note: "Cita médica",
    });
    expect(res.status).toBe(200);
    expect(res.body.exception).toEqual({ date: "2026-10-30", workday: null, note: "Cita médica" });

    const list = await api.get(emp(carlosId, october), owner);
    expect(list.body.exceptions).toHaveLength(1);
  });

  it("un día de quincena hasta tarde, con almuerzo movido", async () => {
    const res = await put(emp(carlosId, "/exceptions/2026-10-30"), owner, quincena);
    expect(res.status).toBe(200);
    expect(res.body.exception.workday).toEqual(quincena.workday);
  });

  it("repetir la misma excepción la reemplaza, no la duplica", async () => {
    await put(emp(carlosId, "/exceptions/2026-10-30"), owner, { workday: null });
    await put(emp(carlosId, "/exceptions/2026-10-30"), owner, quincena);
    expect(await ScheduleExceptionModel.countDocuments({ businessId: bizId })).toBe(1);
  });

  it("lista solo el rango pedido, en orden", async () => {
    for (const date of ["2026-11-15", "2026-10-30", "2026-12-24"]) {
      await put(emp(carlosId, `/exceptions/${date}`), owner, { workday: null });
    }
    const res = await api.get(emp(carlosId, "/exceptions?from=2026-10-01&to=2026-11-30"), owner);
    expect(res.body.exceptions.map((e: { date: string }) => e.date)).toEqual([
      "2026-10-30",
      "2026-11-15",
    ]);
  });

  it("borrar la excepción devuelve el día a la semana tipo", async () => {
    await put(emp(carlosId, "/exceptions/2026-10-30"), owner, { workday: null });
    const res = await api.delete(emp(carlosId, "/exceptions/2026-10-30"), owner);
    expect(res.status).toBe(204);
    const again = await api.delete(emp(carlosId, "/exceptions/2026-10-30"), owner);
    expect(again.status).toBe(404);
  });

  it("responde 422 con una fecha que no existe", async () => {
    const res = await put(emp(carlosId, "/exceptions/2026-02-30"), owner, { workday: null });
    expect(res.status).toBe(422);
  });

  it("responde 422 con un almuerzo fuera de la jornada", async () => {
    const res = await put(emp(carlosId, "/exceptions/2026-10-30"), owner, {
      workday: { start: "09:00", end: "13:00", lunch: { start: "12:30", durationMinutes: 90 } },
    });
    expect(res.status).toBe(422);
  });

  it("valida el rango de consulta (422)", async () => {
    const withoutRange = await api.get(emp(carlosId, "/exceptions"), owner);
    const tooLong = await api.get(
      emp(carlosId, "/exceptions?from=2026-01-01&to=2026-12-31"),
      owner,
    );
    expect([withoutRange.status, tooLong.status]).toEqual([422, 422]);
  });

  it("el barbero ve sus excepciones, pero no las de otros ni las cambia (403)", async () => {
    await put(emp(barberEmployeeId, "/exceptions/2026-10-30"), owner, { workday: null });

    const own = await api.get(emp(barberEmployeeId, october), barber);
    expect(own.status).toBe(200);
    expect(own.body.exceptions).toHaveLength(1);

    const others = await api.get(emp(carlosId, october), barber);
    expect(others.status).toBe(403);

    const change = await put(emp(barberEmployeeId, "/exceptions/2026-10-31"), barber, {
      workday: null,
    });
    expect(change.status).toBe(403);
  });

  it("un empleado inexistente responde 404", async () => {
    const res = await put(emp("0123456789abcdef01234567", "/exceptions/2026-10-30"), owner, {
      workday: null,
    });
    expect(res.status).toBe(404);
  });
});

describe("Aislamiento entre negocios", () => {
  it("otro negocio no ve ni cambia horarios de un empleado ajeno (404)", async () => {
    const other = await signUp("otro@ejemplo.com");
    const otherBiz = await createBusinessAs(other, "barberia-ajena");
    await put(emp(carlosId, "/exceptions/2026-10-30"), owner, { workday: null });

    const base = `/businesses/${otherBiz}/employees/${carlosId}`;
    const week = await put(`${base}/schedule`, other, DEFAULT_WEEKLY_SCHEDULE);
    const list = await api.get(`${base}${october}`, other);
    const change = await put(`${base}/exceptions/2026-10-30`, other, quincena);
    const remove = await api.delete(`${base}/exceptions/2026-10-30`, other);

    expect([week.status, list.status, change.status, remove.status]).toEqual([404, 404, 404, 404]);
    const doc = await ScheduleExceptionModel.findOne({ businessId: bizId }).lean();
    expect(doc?.workday).toBeNull();
  });
});
