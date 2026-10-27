import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useTestDatabase } from "../../../tests/db.js";
import { api, createBusinessAs, joinAs, signUp, type Actor } from "../../../tests/actors.js";
import { CustomerModel } from "../customers/customer.model.js";
import { EmployeeModel } from "../employees/employee.model.js";
import { MembershipModel } from "../memberships/membership.model.js";
import { ScheduleExceptionModel } from "../schedules/schedule-exception.model.js";
import { AppointmentModel } from "./appointment.model.js";
import { AppointmentSlotModel } from "./appointment-slot.model.js";

useTestDatabase();

const TODAY = "2026-10-27";
const NOW_UTC = "2026-10-27T15:00:00Z";
const andres = { name: "Andrés Gómez", phone: "300 123 4567" };

let owner: Actor;
let admin: Actor;
let barber: Actor;
let bizId: string;
let carlosId: string;
let luisId: string;
let corteId: string;
let barbaId: string;
const path = (suffix = "") => `/businesses/${bizId}/appointments${suffix}`;

const count = (model: { countDocuments: (f: object) => Promise<number> }) =>
  model.countDocuments({ businessId: { $exists: true } });

function booking(overrides: Record<string, unknown> = {}) {
  return {
    employeeId: luisId,
    date: TODAY,
    start: "11:00",
    serviceIds: [corteId],
    customer: andres,
    ...overrides,
  };
}

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ["Date"], now: new Date(NOW_UTC) });
  const db = AppointmentModel.db;
  await Promise.all(Object.values(db.collections).map((c) => c.deleteMany({})));

  owner = await signUp("dueno@ejemplo.com");
  bizId = await createBusinessAs(owner, "barberia-citas");
  admin = await joinAs(bizId, "admin@ejemplo.com", "admin");
  barber = await joinAs(bizId, "barbero@ejemplo.com", "barber");

  const services = `/businesses/${bizId}/services`;
  corteId = (await api.post(services, owner, { name: "Corte", price: 30000, durationMinutes: 30 }))
    .body.service.id;
  barbaId = (await api.post(services, owner, { name: "Barba", price: 15000, durationMinutes: 15 }))
    .body.service.id;

  const employees = `/businesses/${bizId}/employees`;
  carlosId = (await api.post(employees, owner, { displayName: "Carlos" })).body.employee.id;
  luisId = (await api.post(employees, owner, { displayName: "Luis" })).body.employee.id;

  const membership = await MembershipModel.findOne({ businessId: bizId, userId: barber.userId });
  await EmployeeModel.updateOne(
    { businessId: bizId, _id: carlosId },
    { $set: { membershipId: membership!._id } },
  );
});

afterEach(() => {
  vi.useRealTimers();
});

describe("POST /appointments", () => {
  it("el owner agenda con cliente nuevo y copia los servicios", async () => {
    const res = await api.post(path(), owner, booking({ serviceIds: [corteId, barbaId] }));

    expect(res.status).toBe(201);
    expect(res.body.warnings).toEqual([]);
    expect(res.body.appointment).toMatchObject({
      employeeId: luisId,
      date: TODAY,
      start: "11:00",
      end: "11:45",
      status: "pending",
      source: "internal",
      recordedAfter: false,
      customer: { name: "Andrés Gómez", phone: "+573001234567" },
      services: [
        { serviceId: corteId, name: "Corte", price: 30000, durationMinutes: 30 },
        { serviceId: barbaId, name: "Barba", price: 15000, durationMinutes: 15 },
      ],
    });
    expect(res.body.appointment.customer.id).toBeTypeOf("string");
    expect(await count(CustomerModel)).toBe(1);
    expect(await count(AppointmentSlotModel)).toBe(9);
  });

  it("guarda quién la creó en el historial", async () => {
    const res = await api.post(path(), admin, booking());
    const doc = await AppointmentModel.findOne({ businessId: bizId, _id: res.body.appointment.id });
    expect(doc!.history).toHaveLength(1);
    expect(doc!.history[0]).toMatchObject({
      kind: "created",
      fromStatus: null,
      toStatus: "pending",
    });
  });

  it("reutiliza el cliente por celular sin cambiarle el nombre", async () => {
    await api.post(path(), owner, booking());
    const res = await api.post(
      path(),
      owner,
      booking({ start: "15:00", customer: { name: "Otro", phone: "+57 300-123-4567" } }),
    );
    expect(res.body.appointment.customer.name).toBe("Andrés Gómez");
    expect(await count(CustomerModel)).toBe(1);
  });

  it("acepta un cliente existente por id", async () => {
    const first = await api.post(path(), owner, booking());
    const res = await api.post(
      path(),
      owner,
      booking({ start: "15:00", customer: { id: first.body.appointment.customer.id } }),
    );
    expect(res.status).toBe(201);
    expect(res.body.appointment.customer.name).toBe("Andrés Gómez");
  });

  it("422 si el cliente por id no existe", async () => {
    const res = await api.post(
      path(),
      owner,
      booking({ customer: { id: "65f0a1b2c3d4e5f6a7b8c9d0" } }),
    );
    expect(res.status).toBe(422);
  });

  it("422 si falta el celular del cliente", async () => {
    const res = await api.post(path(), owner, booking({ customer: { name: "Andrés" } }));
    expect(res.status).toBe(422);
  });
});

describe("anti doble reserva", () => {
  it("409 SLOT_TAKEN si se cruza, y no deja nada a medias", async () => {
    await api.post(path(), owner, booking());
    const res = await api.post(
      path(),
      owner,
      booking({ start: "11:15", customer: { name: "Camilo", phone: "311 555 0000" } }),
    );

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("SLOT_TAKEN");
    expect(await count(AppointmentModel)).toBe(1);
    expect(await count(CustomerModel)).toBe(1);
    expect(await count(AppointmentSlotModel)).toBe(6);
  });

  it("permite una cita justo cuando termina la anterior", async () => {
    await api.post(path(), owner, booking());
    const res = await api.post(path(), owner, booking({ start: "11:30" }));
    expect(res.status).toBe(201);
  });

  it("otro barbero sí puede a la misma hora", async () => {
    await api.post(path(), owner, booking());
    const res = await api.post(path(), owner, booking({ employeeId: carlosId }));
    expect(res.status).toBe(201);
  });

  it("dos reservas simultáneas: solo una gana", async () => {
    const [a, b] = await Promise.all([
      api.post(path(), owner, booking()),
      api.post(
        path(),
        admin,
        booking({ start: "11:10", customer: { name: "Camilo", phone: "311 555 0000" } }),
      ),
    ]);
    expect([a.status, b.status].sort()).toEqual([201, 409]);
    expect(await count(AppointmentModel)).toBe(1);
  });
});

describe("avisos de horario (no bloquean)", () => {
  it.each([
    ["después de la salida habitual", { start: "18:45" }, ["after_usual_end"]],
    ["en el almuerzo", { start: "13:30" }, ["during_lunch"]],
    ["antes de la entrada", { date: "2026-10-28", start: "08:30" }, ["before_start"]],
    ["en su día libre", { date: "2026-11-01", start: "10:00" }, ["day_off"]],
  ])("%s", async (_caso, override, warnings) => {
    const res = await api.post(path(), owner, booking(override));
    expect(res.status).toBe(201);
    expect(res.body.warnings).toEqual(warnings);
  });

  it("un día especial reemplaza la semana tipo", async () => {
    await ScheduleExceptionModel.create({
      businessId: bizId,
      employeeId: luisId,
      date: "2026-10-28",
      workday: null,
      note: "Cita médica",
    });
    const res = await api.post(path(), owner, booking({ date: "2026-10-28" }));
    expect(res.body.warnings).toEqual(["day_off"]);
  });
});

describe("validaciones de tiempo y datos", () => {
  it("422 en una fecha pasada", async () => {
    const res = await api.post(path(), owner, booking({ date: "2026-10-26" }));
    expect(res.status).toBe(422);
    expect(res.body.error.details[0].path).toBe("date");
  });

  it("422 hoy en una hora que ya pasó, pero acepta la hora actual", async () => {
    const past = await api.post(path(), owner, booking({ start: "09:30" }));
    expect(past.status).toBe(422);
    expect(past.body.error.details[0].path).toBe("start");
    expect((await api.post(path(), owner, booking({ start: "10:00" }))).status).toBe(201);
  });

  it("422 si la cita pasa de la medianoche", async () => {
    const res = await api.post(path(), owner, booking({ date: "2026-10-28", start: "23:45" }));
    expect(res.status).toBe(422);
  });

  it("422 con un servicio desactivado o inexistente", async () => {
    await api.patch(`/businesses/${bizId}/services/${barbaId}`, owner, { active: false });
    expect((await api.post(path(), owner, booking({ serviceIds: [barbaId] }))).status).toBe(422);
    expect(
      (await api.post(path(), owner, booking({ serviceIds: ["65f0a1b2c3d4e5f6a7b8c9d0"] }))).status,
    ).toBe(422);
  });

  it("409 con un barbero desactivado y 422 si no existe", async () => {
    await api.patch(`/businesses/${bizId}/employees/${luisId}`, owner, { active: false });
    expect((await api.post(path(), owner, booking())).status).toBe(409);
    expect(
      (await api.post(path(), owner, booking({ employeeId: "65f0a1b2c3d4e5f6a7b8c9d0" }))).status,
    ).toBe(422);
  });
});

describe("permisos del barbero", () => {
  it("agenda en su propia agenda", async () => {
    const res = await api.post(path(), barber, booking({ employeeId: carlosId }));
    expect(res.status).toBe(201);
    expect(res.body.appointment.customer.name).toBe("Andrés Gómez");
  });

  it("no agenda en la de otro barbero (403)", async () => {
    const res = await api.post(path(), barber, booking());
    expect(res.status).toBe(403);
    expect(await count(AppointmentModel)).toBe(0);
  });
});

describe("GET /appointments", () => {
  beforeEach(async () => {
    await api.post(path(), owner, booking({ start: "15:00" }));
    await api.post(path(), owner, booking({ employeeId: carlosId, start: "11:00" }));
    await api.post(path(), owner, booking({ start: "12:00" }));
    await api.post(path(), owner, booking({ date: "2026-10-28" }));
  });

  it("el owner ve el día completo en orden de hora", async () => {
    const res = await api.get(path(`?date=${TODAY}`), owner);
    expect(res.status).toBe(200);
    expect(res.body.appointments.map((a: { start: string }) => a.start)).toEqual([
      "11:00",
      "12:00",
      "15:00",
    ]);
  });

  it("filtra por barbero", async () => {
    const res = await api.get(path(`?date=${TODAY}&employeeId=${luisId}`), admin);
    expect(res.body.appointments).toHaveLength(2);
  });

  it("el barbero solo ve las suyas", async () => {
    const res = await api.get(path(`?date=${TODAY}`), barber);
    expect(res.body.appointments).toHaveLength(1);
    expect(res.body.appointments[0].employeeId).toBe(carlosId);
  });

  it("el barbero no puede pedir la agenda de otro (403)", async () => {
    const res = await api.get(path(`?date=${TODAY}&employeeId=${luisId}`), barber);
    expect(res.status).toBe(403);
  });

  it("un barbero sin ficha de empleado ve la agenda vacía", async () => {
    const other = await joinAs(bizId, "sinficha@ejemplo.com", "barber");
    const res = await api.get(path(`?date=${TODAY}`), other);
    expect(res.status).toBe(200);
    expect(res.body.appointments).toEqual([]);
  });

  it("422 sin fecha o con fecha inválida", async () => {
    expect((await api.get(path(), owner)).status).toBe(422);
    expect((await api.get(path("?date=2026-02-30"), owner)).status).toBe(422);
  });
});

describe("GET /appointments/:id y aislamiento", () => {
  let luisAppointment: string;
  let carlosAppointment: string;

  beforeEach(async () => {
    luisAppointment = (await api.post(path(), owner, booking())).body.appointment.id;
    carlosAppointment = (await api.post(path(), owner, booking({ employeeId: carlosId }))).body
      .appointment.id;
  });

  it("el barbero ve la suya y no la de otro (404)", async () => {
    expect((await api.get(path(`/${carlosAppointment}`), barber)).status).toBe(200);
    expect((await api.get(path(`/${luisAppointment}`), barber)).status).toBe(404);
  });

  it("otro negocio no ve ni usa nada de este", async () => {
    const otherOwner = await signUp("otro@ejemplo.com");
    const otherBiz = await createBusinessAs(otherOwner, "otra-barberia");

    expect(
      (await api.get(`/businesses/${otherBiz}/appointments/${luisAppointment}`, otherOwner)).status,
    ).toBe(404);
    const res = await api.post(`/businesses/${otherBiz}/appointments`, otherOwner, booking());
    expect(res.status).toBe(422);
  });
});
