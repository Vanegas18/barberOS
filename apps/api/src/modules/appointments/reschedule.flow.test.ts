import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useTestDatabase } from "../../../tests/db.js";
import { api } from "../../../tests/actors.js";
import { countIn, setupAgenda, type Agenda } from "../../../tests/agenda.js";
import { AppointmentModel } from "./appointment.model.js";
import { AppointmentSlotModel } from "./appointment-slot.model.js";

useTestDatabase();

const TODAY = "2026-10-27";
let a: Agenda;
let appointmentId: string;
const path = (suffix = "") => `/businesses/${a.bizId}/appointments${suffix}`;

function booking(overrides: Record<string, unknown> = {}) {
  return {
    employeeId: a.luisId,
    date: TODAY,
    start: "11:00",
    serviceIds: [a.corteId],
    customer: { name: "Andrés", phone: "300 123 4567" },
    ...overrides,
  };
}

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ["Date"], now: new Date("2026-10-27T15:00:00Z") });
  const db = AppointmentModel.db;
  await Promise.all(Object.values(db.collections).map((c) => c.deleteMany({})));
  a = await setupAgenda("barberia-mover");
  appointmentId = (await api.post(path(), a.owner, booking())).body.appointment.id;
});

afterEach(() => {
  vi.useRealTimers();
});

describe("PATCH /appointments/:id", () => {
  it("mueve la hora, libera la anterior y lo deja en el historial", async () => {
    const res = await api.patch(path(`/${appointmentId}`), a.owner, { start: "12:00" });

    expect(res.status).toBe(200);
    expect(res.body.appointment).toMatchObject({ start: "12:00", end: "12:30" });
    expect((await api.post(path(), a.owner, booking())).status).toBe(201);

    const doc = await AppointmentModel.findOne({ businessId: a.bizId, _id: appointmentId });
    expect(doc!.history.map((h) => h.kind)).toEqual(["created", "rescheduled"]);
  });

  it("puede moverse encima de su propio horario anterior", async () => {
    const res = await api.patch(path(`/${appointmentId}`), a.owner, { start: "11:15" });
    expect(res.status).toBe(200);
    expect(await countIn(AppointmentSlotModel)).toBe(6);
  });

  it("409 SLOT_TAKEN si el nuevo horario está ocupado, y no cambia nada", async () => {
    await api.post(path(), a.owner, booking({ start: "14:00" }));
    const res = await api.patch(path(`/${appointmentId}`), a.owner, { start: "14:15" });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("SLOT_TAKEN");
    expect((await api.get(path(`/${appointmentId}`), a.owner)).body.appointment.start).toBe(
      "11:00",
    );
    expect(await countIn(AppointmentSlotModel)).toBe(12);
  });

  it("cambia de barbero y libera al anterior", async () => {
    const res = await api.patch(path(`/${appointmentId}`), a.admin, { employeeId: a.carlosId });
    expect(res.body.appointment.employeeId).toBe(a.carlosId);
    expect((await api.post(path(), a.owner, booking())).status).toBe(201);
  });

  it("cambia los servicios y recalcula la hora de salida", async () => {
    const res = await api.patch(path(`/${appointmentId}`), a.owner, {
      serviceIds: [a.corteId, a.barbaId],
    });
    expect(res.body.appointment.end).toBe("11:45");
    expect(res.body.appointment.services).toHaveLength(2);
  });

  it("si no cambian los servicios, conserva el precio copiado", async () => {
    await api.patch(`/businesses/${a.bizId}/services/${a.corteId}`, a.owner, { price: 40000 });
    const res = await api.patch(path(`/${appointmentId}`), a.owner, { start: "12:00" });
    expect(res.body.appointment.services[0].price).toBe(30000);
  });

  it("cambiar solo la nota no se registra como movimiento", async () => {
    const res = await api.patch(path(`/${appointmentId}`), a.owner, { note: "Llega tarde" });
    expect(res.body.appointment.note).toBe("Llega tarde");
    const doc = await AppointmentModel.findOne({ businessId: a.bizId, _id: appointmentId });
    expect(doc!.history).toHaveLength(1);
  });

  it("422 al mover a una fecha u hora pasada", async () => {
    expect(
      (await api.patch(path(`/${appointmentId}`), a.owner, { date: "2026-10-26" })).status,
    ).toBe(422);
    expect((await api.patch(path(`/${appointmentId}`), a.owner, { start: "09:00" })).status).toBe(
      422,
    );
  });

  it("422 sin campos", async () => {
    expect((await api.patch(path(`/${appointmentId}`), a.owner, {})).status).toBe(422);
  });

  it("409 si la cita ya no está pendiente", async () => {
    await AppointmentModel.updateOne(
      { businessId: a.bizId, _id: appointmentId },
      { $set: { status: "in_service" } },
    );
    const res = await api.patch(path(`/${appointmentId}`), a.owner, { start: "12:00" });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("INVALID_STATUS_CHANGE");
  });
});

describe("permisos del barbero al mover", () => {
  let carlosAppointment: string;

  beforeEach(async () => {
    carlosAppointment = (await api.post(path(), a.owner, booking({ employeeId: a.carlosId }))).body
      .appointment.id;
  });

  it("mueve su propia cita", async () => {
    const res = await api.patch(path(`/${carlosAppointment}`), a.barber, { start: "16:00" });
    expect(res.status).toBe(200);
  });

  it("no se la pasa a otro barbero (403)", async () => {
    const res = await api.patch(path(`/${carlosAppointment}`), a.barber, { employeeId: a.luisId });
    expect(res.status).toBe(403);
  });

  it("no ve ni mueve la cita de otro (404)", async () => {
    const res = await api.patch(path(`/${appointmentId}`), a.barber, { start: "16:00" });
    expect(res.status).toBe(404);
  });
});
