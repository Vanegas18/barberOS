import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useTestDatabase } from "../../../tests/db.js";
import { api } from "../../../tests/actors.js";
import { countIn, setupAgenda, type Agenda } from "../../../tests/agenda.js";
import { AppointmentModel } from "./appointment.model.js";
import { AppointmentSlotModel } from "./appointment-slot.model.js";

useTestDatabase();

const TODAY = "2026-10-27";
const NOW = new Date("2026-10-27T15:00:00Z");
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

const act = (id: string, actor: Agenda["owner"], action: string) =>
  api.post(path(`/${id}/actions`), actor, { action });

const undo = (id: string, actor: Agenda["owner"]) => api.post(path(`/${id}/undo`), actor, {});

const minutesLater = (minutes: number) =>
  vi.setSystemTime(new Date(NOW.getTime() + minutes * 60_000));

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ["Date"], now: NOW });
  const db = AppointmentModel.db;
  await Promise.all(Object.values(db.collections).map((c) => c.deleteMany({})));
  a = await setupAgenda("barberia-estados");
  appointmentId = (await api.post(path(), a.owner, booking())).body.appointment.id;
});

afterEach(() => {
  vi.useRealTimers();
});

describe("cambios de estado", () => {
  it("Pendiente → En silla → Atendida, con historial", async () => {
    const arrived = await act(appointmentId, a.admin, "check_in");
    expect(arrived.status).toBe(200);
    expect(arrived.body.appointment.status).toBe("in_service");

    const finished = await act(appointmentId, a.admin, "complete");
    expect(finished.body.appointment.status).toBe("completed");

    const doc = await AppointmentModel.findOne({ businessId: a.bizId, _id: appointmentId });
    expect(doc!.history.map((h) => [h.kind, h.fromStatus, h.toStatus])).toEqual([
      ["created", null, "pending"],
      ["check_in", "pending", "in_service"],
      ["complete", "in_service", "completed"],
    ]);
  });

  it.each([
    ["terminar sin haber llegado", [], "complete"],
    ["volver a marcar la llegada", ["check_in"], "check_in"],
    ["marcar no vino estando en silla", ["check_in"], "no_show"],
    ["cancelar una atendida", ["check_in", "complete"], "cancel"],
  ])("409 INVALID_STATUS_CHANGE al %s", async (_caso, before, action) => {
    for (const step of before) await act(appointmentId, a.owner, step);
    const res = await act(appointmentId, a.owner, action);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("INVALID_STATUS_CHANGE");
  });

  it("cancelar libera el espacio", async () => {
    const res = await act(appointmentId, a.owner, "cancel");
    expect(res.body.appointment.status).toBe("cancelled");
    expect(await countIn(AppointmentSlotModel)).toBe(0);
    expect((await api.post(path(), a.owner, booking())).status).toBe(201);
  });

  it("cancelar estando en silla también libera el espacio", async () => {
    await act(appointmentId, a.owner, "check_in");
    const res = await act(appointmentId, a.owner, "cancel");
    expect(res.body.appointment.status).toBe("cancelled");
    expect(await countIn(AppointmentSlotModel)).toBe(0);
  });

  it("no vino libera el espacio", async () => {
    const res = await act(appointmentId, a.owner, "no_show");
    expect(res.body.appointment.status).toBe("no_show");
    expect(await countIn(AppointmentSlotModel)).toBe(0);
  });

  it("la llegada y el no vino no se marcan antes del día de la cita", async () => {
    const tomorrow = (await api.post(path(), a.owner, booking({ date: "2026-10-28" }))).body
      .appointment.id;
    expect((await act(tomorrow, a.owner, "check_in")).status).toBe(409);
    expect((await act(tomorrow, a.owner, "no_show")).status).toBe(409);
    expect((await act(tomorrow, a.owner, "cancel")).status).toBe(200);
  });

  it("422 con una acción inválida", async () => {
    expect((await act(appointmentId, a.owner, "confirm")).status).toBe(422);
  });
});

describe("permisos del barbero", () => {
  it("cambia el estado de sus citas", async () => {
    const mine = (await api.post(path(), a.owner, booking({ employeeId: a.carlosId }))).body
      .appointment.id;
    expect((await act(mine, a.barber, "check_in")).status).toBe(200);
  });

  it("no toca las de otro barbero (404)", async () => {
    expect((await act(appointmentId, a.barber, "check_in")).status).toBe(404);
  });
});

describe("deshacer", () => {
  it("deshace el último cambio y avisa que ya no hay más", async () => {
    const arrived = await act(appointmentId, a.owner, "check_in");
    expect(arrived.body.appointment.canUndo).toBe(true);

    const res = await undo(appointmentId, a.owner);
    expect(res.status).toBe(200);
    expect(res.body.appointment).toMatchObject({ status: "pending", canUndo: false });

    const again = await undo(appointmentId, a.owner);
    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe("UNDO_NOT_AVAILABLE");
  });

  it("no se puede deshacer la creación", async () => {
    expect((await undo(appointmentId, a.owner)).status).toBe(409);
  });

  it("vence a los 5 minutos", async () => {
    await act(appointmentId, a.owner, "check_in");
    minutesLater(6);

    const shown = await api.get(path(`/${appointmentId}`), a.owner);
    expect(shown.body.appointment.canUndo).toBe(false);
    expect((await undo(appointmentId, a.owner)).status).toBe(409);
  });

  it("deshacer una cancelación vuelve a tomar el espacio", async () => {
    await act(appointmentId, a.owner, "cancel");
    const res = await undo(appointmentId, a.owner);
    expect(res.body.appointment.status).toBe("pending");
    expect(await countIn(AppointmentSlotModel)).toBe(6);
  });

  it("si el espacio ya lo tomó otra cita, no deshace (409 SLOT_TAKEN)", async () => {
    await act(appointmentId, a.owner, "cancel");
    await api.post(path(), a.owner, booking({ customer: { name: "Camilo", phone: "3115550000" } }));

    const res = await undo(appointmentId, a.owner);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("SLOT_TAKEN");
    const shown = await api.get(path(`/${appointmentId}`), a.owner);
    expect(shown.body.appointment.status).toBe("cancelled");
  });

  it("el barbero no deshace lo que hizo otro (403); el owner sí deshace lo del barbero", async () => {
    const mine = (await api.post(path(), a.owner, booking({ employeeId: a.carlosId }))).body
      .appointment.id;

    await act(mine, a.admin, "check_in");
    expect((await undo(mine, a.barber)).status).toBe(403);

    await act(mine, a.barber, "complete");
    expect((await undo(mine, a.owner)).status).toBe(200);
  });
});

describe("GET /appointments/:id/history", () => {
  it("muestra quién hizo cada cambio", async () => {
    await act(appointmentId, a.admin, "check_in");
    const res = await api.get(path(`/${appointmentId}/history`), a.owner);

    expect(res.status).toBe(200);
    expect(res.body.history).toMatchObject([
      { kind: "created", byName: "Juan Dueño", fromStatus: null, toStatus: "pending" },
      { kind: "check_in", byName: "Usuario", fromStatus: "pending", toStatus: "in_service" },
    ]);
    expect(res.body.history[0].at).toBe(NOW.toISOString());
  });

  it("el barbero no ve el historial de citas ajenas (404)", async () => {
    expect((await api.get(path(`/${appointmentId}/history`), a.barber)).status).toBe(404);
  });
});
