import { beforeEach, describe, expect, it } from "vitest";
import { useTestDatabase } from "../../../tests/db.js";
import { api, createBusinessAs, joinAs, signUp, type Actor } from "../../../tests/actors.js";
import { EmployeeModel } from "./employee.model.js";

useTestDatabase();

const carlos = {
  displayName: "Carlos",
  phone: "300 123 4567",
  earningRule: { type: "percentage", rateBp: 5000 },
};

let owner: Actor;
let admin: Actor;
let barber: Actor;
let bizId: string;
const path = (suffix = "") => `/businesses/${bizId}/employees${suffix}`;

beforeEach(async () => {
  const db = EmployeeModel.db;
  await Promise.all(Object.values(db.collections).map((c) => c.deleteMany({})));

  owner = await signUp("dueno@ejemplo.com");
  bizId = await createBusinessAs(owner, "barberia-equipo");
  admin = await joinAs(bizId, "admin@ejemplo.com", "admin");
  barber = await joinAs(bizId, "barbero@ejemplo.com", "barber");
});

describe("POST /employees", () => {
  it("el owner crea un empleado sin cuenta, con celular normalizado y su regla", async () => {
    const res = await api.post(path(), owner, carlos);

    expect(res.status).toBe(201);
    expect(res.body.employee).toMatchObject({
      displayName: "Carlos",
      phone: "+573001234567",
      earningRule: { type: "percentage", rateBp: 5000 },
      acceptsOnlineBookings: true,
      active: true,
      hasAccount: false,
      isMe: false,
    });
  });

  it("sin regla de ganancia, el empleado queda en none", async () => {
    const res = await api.post(path(), owner, { displayName: "Andrés" });
    expect(res.status).toBe(201);
    expect(res.body.employee.earningRule).toEqual({ type: "none" });
    expect(res.body.employee.phone).toBeNull();
  });

  it("guarda una regla fija sin restos de otros tipos", async () => {
    const res = await api.post(path(), owner, {
      displayName: "Andrés",
      earningRule: { type: "fixed", amount: 12000, rateBp: 9999 },
    });
    expect(res.status).toBe(201);
    expect(res.body.employee.earningRule).toEqual({ type: "fixed", amount: 12000 });
  });

  it("el dueño se registra como empleado con linkSelf", async () => {
    const res = await api.post(path(), owner, {
      displayName: "Juan",
      earningRule: { type: "none" },
      linkSelf: true,
    });
    expect(res.status).toBe(201);
    expect(res.body.employee).toMatchObject({ hasAccount: true, isMe: true });

    const me = await api.get(path("/me"), owner);
    expect(me.status).toBe(200);
    expect(me.body.employee.displayName).toBe("Juan");
  });

  it("no permite vincular la misma cuenta dos veces (409)", async () => {
    await api.post(path(), owner, { displayName: "Juan", linkSelf: true });
    const res = await api.post(path(), owner, { displayName: "Juan Dos", linkSelf: true });
    expect(res.status).toBe(409);
    expect(res.body.error.message).toMatch(/Ya estás registrado/);
  });

  it("varios empleados sin cuenta no chocan entre sí", async () => {
    const a = await api.post(path(), owner, { displayName: "Carlos" });
    const b = await api.post(path(), owner, { displayName: "Andrés" });
    expect([a.status, b.status]).toEqual([201, 201]);
  });

  it("responde 409 con un nombre repetido aunque cambien tildes y mayúsculas", async () => {
    await api.post(path(), owner, { displayName: "Andrés" });
    const res = await api.post(path(), owner, { displayName: "ANDRES" });
    expect(res.status).toBe(409);
    expect(res.body.error.message).toMatch(/Agrega una inicial/);
  });

  it("el admin crea empleados, pero sin regla de ganancia", async () => {
    const ok = await api.post(path(), admin, { displayName: "Andrés" });
    expect(ok.status).toBe(201);
    expect(ok.body.employee.earningRule).toEqual({ type: "none" });

    const denied = await api.post(path(), admin, carlos);
    expect(denied.status).toBe(403);
    expect(await EmployeeModel.countDocuments({ businessId: bizId })).toBe(1);
  });

  it("el barbero no puede crear empleados (403)", async () => {
    const res = await api.post(path(), barber, { displayName: "Otro" });
    expect(res.status).toBe(403);
  });

  it.each([
    ["porcentaje mayor a 100 %", { earningRule: { type: "percentage", rateBp: 10001 } }],
    ["porcentaje con decimales", { earningRule: { type: "percentage", rateBp: 50.5 } }],
    ["monto fijo negativo", { earningRule: { type: "fixed", amount: -1 } }],
    ["tipo de regla desconocido", { earningRule: { type: "propina" } }],
    ["porcentaje sin tasa", { earningRule: { type: "percentage" } }],
    ["celular inválido", { phone: "123" }],
    ["nombre de una letra", { displayName: "C" }],
  ])("responde 422 con %s", async (_caso, override) => {
    const res = await api.post(path(), owner, { ...carlos, ...override });
    expect(res.status).toBe(422);
  });
});

describe("GET /employees", () => {
  beforeEach(async () => {
    const res = await api.post(path(), owner, { displayName: "Beto" });
    await api.patch(path(`/${res.body.employee.id}`), owner, { active: false });
    await api.post(path(), owner, { displayName: "Andrés" });
  });

  it("owner y admin ven a todo el equipo, activos primero", async () => {
    for (const actor of [owner, admin]) {
      const res = await api.get(path(), actor);
      expect(res.status).toBe(200);
      expect(res.body.employees.map((e: { displayName: string }) => e.displayName)).toEqual([
        "Andrés",
        "Beto",
      ]);
    }
  });

  it("el barbero no ve la lista del equipo ni sus reglas (403)", async () => {
    const res = await api.get(path(), barber);
    expect(res.status).toBe(403);
  });

  it("/me responde 404 si quien pregunta no es empleado", async () => {
    const res = await api.get(path("/me"), barber);
    expect(res.status).toBe(404);
  });

  it("un id mal formado responde 404, no 500", async () => {
    const res = await api.get(path("/no-es-un-id"), owner);
    expect(res.status).toBe(404);
  });
});

describe("PATCH /employees/:id", () => {
  let employeeId: string;

  beforeEach(async () => {
    const res = await api.post(path(), owner, carlos);
    employeeId = res.body.employee.id as string;
  });

  it("el owner cambia la regla de porcentaje a fijo y reemplaza la anterior", async () => {
    const res = await api.patch(path(`/${employeeId}`), owner, {
      earningRule: { type: "fixed", amount: 15000 },
    });
    expect(res.status).toBe(200);
    expect(res.body.employee.earningRule).toEqual({ type: "fixed", amount: 15000 });

    const doc = await EmployeeModel.findOne({ businessId: bizId }).lean();
    expect(doc?.earningRule).toEqual({ type: "fixed", amount: 15000 });
  });

  it("el admin edita datos del empleado, pero no su regla (403)", async () => {
    const ok = await api.patch(path(`/${employeeId}`), admin, { acceptsOnlineBookings: false });
    expect(ok.status).toBe(200);

    const denied = await api.patch(path(`/${employeeId}`), admin, {
      earningRule: { type: "percentage", rateBp: 9000 },
    });
    expect(denied.status).toBe(403);
    const doc = await EmployeeModel.findOne({ businessId: bizId }).lean();
    expect(doc?.earningRule).toEqual({ type: "percentage", rateBp: 5000 });
  });

  it("borra el celular con null", async () => {
    const res = await api.patch(path(`/${employeeId}`), owner, { phone: null });
    expect(res.body.employee.phone).toBeNull();
  });

  it("desactiva sin borrar el documento", async () => {
    const res = await api.patch(path(`/${employeeId}`), owner, { active: false });
    expect(res.body.employee.active).toBe(false);
    expect(await EmployeeModel.countDocuments({ businessId: bizId })).toBe(1);
  });

  it("el barbero no puede editar (403) aunque el body sea inválido", async () => {
    const res = await api.patch(path(`/${employeeId}`), barber, { displayName: "" });
    expect(res.status).toBe(403);
  });

  it("responde 422 si no se envía ningún campo", async () => {
    const res = await api.patch(path(`/${employeeId}`), owner, {});
    expect(res.status).toBe(422);
  });

  it("no existe DELETE", async () => {
    const res = await api.delete(path(`/${employeeId}`), owner);
    expect(res.status).toBe(404);
    expect(await EmployeeModel.countDocuments({ businessId: bizId })).toBe(1);
  });
});

describe("Aislamiento entre negocios", () => {
  let otherOwner: Actor;
  let otherBiz: string;
  let employeeId: string;

  beforeEach(async () => {
    otherOwner = await signUp("otro-dueno@ejemplo.com");
    otherBiz = await createBusinessAs(otherOwner, "barberia-ajena");
    const res = await api.post(path(), owner, carlos);
    employeeId = res.body.employee.id as string;
  });

  it("el id de un empleado ajeno responde 404 desde otro negocio y no se modifica", async () => {
    const show = await api.get(`/businesses/${otherBiz}/employees/${employeeId}`, otherOwner);
    const edit = await api.patch(`/businesses/${otherBiz}/employees/${employeeId}`, otherOwner, {
      earningRule: { type: "percentage", rateBp: 10000 },
    });
    expect(show.status).toBe(404);
    expect(edit.status).toBe(404);

    const doc = await EmployeeModel.findOne({ businessId: bizId }).lean();
    expect(doc?.earningRule).toEqual({ type: "percentage", rateBp: 5000 });
  });

  it("el mismo nombre se puede usar en negocios distintos", async () => {
    const res = await api.post(`/businesses/${otherBiz}/employees`, otherOwner, carlos);
    expect(res.status).toBe(201);
  });

  it("la cuenta del dueño puede ser empleado en cada uno de sus negocios", async () => {
    const second = await createBusinessAs(owner, "segunda-barberia");
    const a = await api.post(path(), owner, { displayName: "Juan", linkSelf: true });
    const b = await api.post(`/businesses/${second}/employees`, owner, {
      displayName: "Juan",
      linkSelf: true,
    });
    expect([a.status, b.status]).toEqual([201, 201]);
  });
});
