import { beforeEach, describe, expect, it } from "vitest";
import { useTestDatabase } from "../../../tests/db.js";
import { api, createBusinessAs, joinAs, signUp, type Actor } from "../../../tests/actors.js";
import { ServiceModel } from "./service.model.js";
import { serviceNameKey } from "./service.service.js";

useTestDatabase();

const corte = { name: "Corte clásico", price: 30000, durationMinutes: 30 };

let owner: Actor;
let admin: Actor;
let barber: Actor;
let bizId: string;
const path = (suffix = "") => `/businesses/${bizId}/services${suffix}`;

beforeEach(async () => {
  const db = ServiceModel.db;
  await Promise.all(Object.values(db.collections).map((c) => c.deleteMany({})));

  owner = await signUp("dueno@ejemplo.com");
  bizId = await createBusinessAs(owner, "barberia-servicios");
  admin = await joinAs(bizId, "admin@ejemplo.com", "admin");
  barber = await joinAs(bizId, "barbero@ejemplo.com", "barber");
});

describe("serviceNameKey", () => {
  it("ignora tildes, mayúsculas y espacios de más", () => {
    expect(serviceNameKey("  Corte   CLÁSICO ")).toBe("corte clasico");
  });
});

describe("POST /services", () => {
  it("el owner crea un servicio con valores por defecto", async () => {
    const res = await api.post(path(), owner, corte);

    expect(res.status).toBe(201);
    expect(res.body.service).toMatchObject({
      name: "Corte clásico",
      description: null,
      price: 30000,
      durationMinutes: 30,
      visibleOnline: true,
      active: true,
    });
    expect(res.body.service.id).toBeTypeOf("string");
  });

  it("el admin también puede crear servicios", async () => {
    const res = await api.post(path(), admin, corte);
    expect(res.status).toBe(201);
  });

  it("el barbero no puede crear servicios (403) y no se guarda nada", async () => {
    const res = await api.post(path(), barber, corte);
    expect(res.status).toBe(403);
    expect(await ServiceModel.countDocuments({ businessId: { $exists: true } })).toBe(0);
  });

  it("responde 409 con un nombre repetido aunque cambien tildes y mayúsculas", async () => {
    await api.post(path(), owner, corte);
    const res = await api.post(path(), owner, { ...corte, name: "corte  CLASICO" });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("CONFLICT");
  });

  it.each([
    ["duración que no es múltiplo de 5", { durationMinutes: 32 }, "durationMinutes"],
    ["duración menor a 5", { durationMinutes: 0 }, "durationMinutes"],
    ["duración mayor a 8 horas", { durationMinutes: 485 }, "durationMinutes"],
    ["precio con decimales", { price: 30000.5 }, "price"],
    ["precio negativo", { price: -1 }, "price"],
    ["precio como texto", { price: "30000" }, "price"],
    ["nombre de una letra", { name: "C" }, "name"],
  ])("responde 422 con %s", async (_caso, override, field) => {
    const res = await api.post(path(), owner, { ...corte, ...override });
    expect(res.status).toBe(422);
    expect(res.body.error.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ path: field })]),
    );
  });

  it("ignora businessId y active enviados en el body", async () => {
    const other = await signUp("otro@ejemplo.com");
    const otherBiz = await createBusinessAs(other, "otra-barberia");

    const res = await api.post(path(), owner, { ...corte, businessId: otherBiz, active: false });

    expect(res.status).toBe(201);
    expect(res.body.service.active).toBe(true);
    const doc = await ServiceModel.findOne({ businessId: bizId }).lean();
    expect(doc?.businessId.toString()).toBe(bizId);
  });
});

describe("GET /services", () => {
  beforeEach(async () => {
    const res = await api.post(path(), owner, { ...corte, name: "Barba" });
    await api.patch(path(`/${res.body.service.id}`), owner, { active: false });
    await api.post(path(), owner, corte);
  });

  it("owner y admin ven activos e inactivos, activos primero", async () => {
    for (const actor of [owner, admin]) {
      const res = await api.get(path(), actor);
      expect(res.status).toBe(200);
      expect(res.body.services.map((s: { name: string }) => s.name)).toEqual([
        "Corte clásico",
        "Barba",
      ]);
    }
  });

  it("el barbero solo ve los activos", async () => {
    const res = await api.get(path(), barber);
    expect(res.status).toBe(200);
    expect(res.body.services).toHaveLength(1);
    expect(res.body.services[0].name).toBe("Corte clásico");
  });

  it("el barbero recibe 404 al pedir un servicio inactivo por id", async () => {
    const list = await api.get(path(), owner);
    const inactive = list.body.services.find((s: { active: boolean }) => !s.active);
    const res = await api.get(path(`/${inactive.id}`), barber);
    expect(res.status).toBe(404);
  });

  it("un id mal formado responde 404, no 500", async () => {
    const res = await api.get(path("/no-es-un-id"), owner);
    expect(res.status).toBe(404);
  });

  it("sin sesión responde 401", async () => {
    const res = await api.get(path());
    expect(res.status).toBe(401);
  });
});

describe("PATCH /services/:id", () => {
  let serviceId: string;

  beforeEach(async () => {
    const res = await api.post(path(), owner, corte);
    serviceId = res.body.service.id as string;
  });

  it("actualiza solo los campos enviados", async () => {
    const res = await api.patch(path(`/${serviceId}`), owner, {
      price: 35000,
      description: "Incluye lavado",
    });
    expect(res.status).toBe(200);
    expect(res.body.service).toMatchObject({
      name: "Corte clásico",
      price: 35000,
      durationMinutes: 30,
      description: "Incluye lavado",
    });
  });

  it("una descripción vacía se guarda como null", async () => {
    await api.patch(path(`/${serviceId}`), owner, { description: "Algo" });
    const res = await api.patch(path(`/${serviceId}`), owner, { description: "  " });
    expect(res.body.service.description).toBeNull();
  });

  it("desactiva y reactiva sin borrar el documento", async () => {
    const off = await api.patch(path(`/${serviceId}`), owner, { active: false });
    expect(off.body.service.active).toBe(false);
    const on = await api.patch(path(`/${serviceId}`), owner, { active: true });
    expect(on.body.service.active).toBe(true);
    expect(await ServiceModel.countDocuments({ businessId: bizId })).toBe(1);
  });

  it("responde 409 al renombrar a un nombre que ya existe", async () => {
    await api.post(path(), owner, { ...corte, name: "Barba" });
    const res = await api.patch(path(`/${serviceId}`), owner, { name: "BARBA" });
    expect(res.status).toBe(409);
  });

  it("responde 422 si no se envía ningún campo", async () => {
    const res = await api.patch(path(`/${serviceId}`), owner, {});
    expect(res.status).toBe(422);
  });

  it("el barbero no puede editar (403) aunque el body sea inválido", async () => {
    const res = await api.patch(path(`/${serviceId}`), barber, { price: -5 });
    expect(res.status).toBe(403);
  });

  it("un servicio inexistente responde 404", async () => {
    const res = await api.patch(path("/0123456789abcdef01234567"), owner, { price: 1000 });
    expect(res.status).toBe(404);
  });

  it("no existe DELETE: un servicio no se borra", async () => {
    const res = await api.delete(path(`/${serviceId}`), owner);
    expect(res.status).toBe(404);
    expect(await ServiceModel.countDocuments({ businessId: bizId })).toBe(1);
  });
});

describe("Aislamiento entre negocios", () => {
  let otherOwner: Actor;
  let otherBiz: string;
  let serviceId: string;

  beforeEach(async () => {
    otherOwner = await signUp("otro-dueno@ejemplo.com");
    otherBiz = await createBusinessAs(otherOwner, "barberia-ajena");
    const res = await api.post(path(), owner, corte);
    serviceId = res.body.service.id as string;
  });

  it("otro negocio no lista los servicios ajenos", async () => {
    const res = await api.get(`/businesses/${otherBiz}/services`, otherOwner);
    expect(res.status).toBe(200);
    expect(res.body.services).toEqual([]);
  });

  it("usar el id de un servicio ajeno desde el negocio propio responde 404", async () => {
    const show = await api.get(`/businesses/${otherBiz}/services/${serviceId}`, otherOwner);
    const edit = await api.patch(`/businesses/${otherBiz}/services/${serviceId}`, otherOwner, {
      price: 1,
    });
    expect(show.status).toBe(404);
    expect(edit.status).toBe(404);

    const doc = await ServiceModel.findOne({ businessId: bizId }).lean();
    expect(doc?.price).toBe(30000);
  });

  it("el dueño de otro negocio no entra al negocio ajeno (404)", async () => {
    const res = await api.get(path(), otherOwner);
    expect(res.status).toBe(404);
  });

  it("el mismo nombre se puede usar en negocios distintos", async () => {
    const res = await api.post(`/businesses/${otherBiz}/services`, otherOwner, corte);
    expect(res.status).toBe(201);
  });
});
