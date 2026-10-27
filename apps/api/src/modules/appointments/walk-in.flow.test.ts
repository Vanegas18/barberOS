import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useTestDatabase } from "../../../tests/db.js";
import { api } from "../../../tests/actors.js";
import { countIn, setupAgenda, type Agenda } from "../../../tests/agenda.js";
import { CustomerModel } from "../customers/customer.model.js";
import { AppointmentModel } from "./appointment.model.js";

useTestDatabase();

const TODAY = "2026-10-27";
let a: Agenda;
const path = (suffix = "") => `/businesses/${a.bizId}/appointments${suffix}`;

const inChair = (overrides: Record<string, unknown> = {}) => ({
  outcome: "in_service",
  employeeId: a.luisId,
  serviceIds: [a.corteId],
  customer: {},
  ...overrides,
});

const done = (overrides: Record<string, unknown> = {}) => ({
  outcome: "completed",
  employeeId: a.luisId,
  serviceIds: [a.corteId],
  customer: {},
  date: TODAY,
  start: "09:00",
  ...overrides,
});

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ["Date"], now: new Date("2026-10-27T15:07:00Z") });
  const db = AppointmentModel.db;
  await Promise.all(Object.values(db.collections).map((c) => c.deleteMany({})));
  a = await setupAgenda("barberia-sin-cita");
});

afterEach(() => {
  vi.useRealTimers();
});

describe("Pasar a la silla", () => {
  it("empieza ahora, redondeado a 5 minutos, como Cliente de paso", async () => {
    const res = await api.post(path("/walk-in"), a.owner, inChair());

    expect(res.status).toBe(201);
    expect(res.body.appointment).toMatchObject({
      date: TODAY,
      start: "10:05",
      end: "10:35",
      status: "in_service",
      source: "walk_in",
      recordedAfter: false,
      customer: { id: null, name: "Cliente de paso", phone: null },
    });
    expect(await countIn(CustomerModel)).toBe(0);
  });

  it("con nombre y celular crea la ficha del cliente", async () => {
    const res = await api.post(
      path("/walk-in"),
      a.owner,
      inChair({ customer: { name: "Andrés", phone: "300 123 4567" } }),
    );
    expect(res.body.appointment.customer.id).toBeTypeOf("string");
    expect(await countIn(CustomerModel)).toBe(1);
  });

  it("con solo el celular de un cliente conocido, lo enlaza", async () => {
    await api.post(`/businesses/${a.bizId}/customers`, a.owner, {
      name: "Andrés Gómez",
      phone: "3001234567",
    });
    const res = await api.post(
      path("/walk-in"),
      a.owner,
      inChair({ customer: { phone: "300 123 4567" } }),
    );
    expect(res.body.appointment.customer).toMatchObject({ name: "Andrés Gómez" });
    expect(res.body.appointment.customer.id).toBeTypeOf("string");
  });

  it("con solo un celular nuevo no crea ficha", async () => {
    const res = await api.post(
      path("/walk-in"),
      a.owner,
      inChair({ customer: { phone: "300 123 4567" } }),
    );
    expect(res.body.appointment.customer).toEqual({
      id: null,
      name: "Cliente de paso",
      phone: "+573001234567",
    });
    expect(await countIn(CustomerModel)).toBe(0);
  });

  it("con solo el nombre lo usa sin crear ficha", async () => {
    const res = await api.post(path("/walk-in"), a.owner, inChair({ customer: { name: "Pipe" } }));
    expect(res.body.appointment.customer).toEqual({ id: null, name: "Pipe", phone: null });
    expect(await countIn(CustomerModel)).toBe(0);
  });

  it("422 con un id de cliente inválido", async () => {
    const res = await api.post(path("/walk-in"), a.owner, inChair({ customer: { id: "malo" } }));
    expect(res.status).toBe(422);
  });

  it("409 SLOT_TAKEN si el barbero ya tiene una cita a esa hora", async () => {
    await api.post(path(), a.owner, {
      employeeId: a.luisId,
      date: TODAY,
      start: "10:20",
      serviceIds: [a.corteId],
      customer: { name: "Camilo", phone: "311 555 0000" },
    });
    const res = await api.post(path("/walk-in"), a.owner, inChair());
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("SLOT_TAKEN");
  });

  it("422 si el servicio pasaría de la medianoche", async () => {
    vi.setSystemTime(new Date("2026-10-28T04:50:00Z"));
    const db = AppointmentModel.db;
    await Promise.all(Object.values(db.collections).map((c) => c.deleteMany({})));
    a = await setupAgenda("barberia-medianoche");

    const res = await api.post(path("/walk-in"), a.owner, inChair());
    expect(res.status).toBe(422);
  });
});

describe("Ya fue atendido", () => {
  it("queda Atendida y marcada como registro posterior", async () => {
    const res = await api.post(path("/walk-in"), a.owner, done());

    expect(res.status).toBe(201);
    expect(res.body.appointment).toMatchObject({
      start: "09:00",
      end: "09:30",
      status: "completed",
      source: "walk_in",
      recordedAfter: true,
    });
    const doc = await AppointmentModel.findOne({
      businessId: a.bizId,
      _id: res.body.appointment.id,
    });
    expect(doc!.history[0]).toMatchObject({
      kind: "created",
      fromStatus: null,
      toStatus: "completed",
    });
  });

  it("422 si la atención todavía no ha terminado", async () => {
    const res = await api.post(path("/walk-in"), a.owner, done({ start: "09:45" }));
    expect(res.status).toBe(422);
    expect(res.body.error.details[0].path).toBe("start");
  });

  it("422 con una fecha futura", async () => {
    const res = await api.post(path("/walk-in"), a.owner, done({ date: "2026-10-28" }));
    expect(res.status).toBe(422);
    expect(res.body.error.details[0].path).toBe("date");
  });

  it("422 sin fecha u hora", async () => {
    const res = await api.post(path("/walk-in"), a.owner, { ...done(), start: undefined });
    expect(res.status).toBe(422);
  });

  it("el barbero no registra días anteriores; owner y admin sí", async () => {
    const yesterday = { date: "2026-10-26", start: "16:00" };
    const barber = await api.post(
      path("/walk-in"),
      a.barber,
      done({ ...yesterday, employeeId: a.carlosId }),
    );
    expect(barber.status).toBe(403);

    expect((await api.post(path("/walk-in"), a.owner, done(yesterday))).status).toBe(201);
    expect(
      (await api.post(path("/walk-in"), a.admin, done({ ...yesterday, start: "17:00" }))).status,
    ).toBe(201);
  });

  it("también respeta el anti doble reserva", async () => {
    await api.post(path("/walk-in"), a.owner, done());
    const res = await api.post(path("/walk-in"), a.owner, done({ start: "09:15" }));
    expect(res.status).toBe(409);
    expect(await countIn(AppointmentModel)).toBe(1);
  });
});

describe("permisos del barbero", () => {
  it("registra en su propia agenda", async () => {
    const res = await api.post(path("/walk-in"), a.barber, inChair({ employeeId: a.carlosId }));
    expect(res.status).toBe(201);
  });

  it("no registra en la agenda de otro (403)", async () => {
    const res = await api.post(path("/walk-in"), a.barber, inChair());
    expect(res.status).toBe(403);
  });
});
