import { beforeEach, describe, expect, it } from "vitest";
import { useTestDatabase } from "../../../tests/db.js";
import { api, createBusinessAs, joinAs, signUp, type Actor } from "../../../tests/actors.js";
import type { TenantContext } from "../../shared/middleware/require-permission.js";
import { CustomerModel } from "./customer.model.js";
import { findOrCreateCustomer } from "./customer.service.js";

useTestDatabase();

const andres = { name: "Andrés Gómez", phone: "300 123 4567" };

let owner: Actor;
let admin: Actor;
let barber: Actor;
let bizId: string;
const path = (suffix = "") => `/businesses/${bizId}/customers${suffix}`;

beforeEach(async () => {
  const db = CustomerModel.db;
  await Promise.all(Object.values(db.collections).map((c) => c.deleteMany({})));

  owner = await signUp("dueno@ejemplo.com");
  bizId = await createBusinessAs(owner, "barberia-clientes");
  admin = await joinAs(bizId, "admin@ejemplo.com", "admin");
  barber = await joinAs(bizId, "barbero@ejemplo.com", "barber");
});

describe("POST /customers", () => {
  it("el owner crea un cliente con el celular normalizado", async () => {
    const res = await api.post(path(), owner, andres);

    expect(res.status).toBe(201);
    expect(res.body.customer).toMatchObject({
      name: "Andrés Gómez",
      phone: "+573001234567",
      note: null,
    });
  });

  it("el admin también puede crear clientes", async () => {
    expect((await api.post(path(), admin, andres)).status).toBe(201);
  });

  it("el barbero no crea clientes desde aquí (403)", async () => {
    const res = await api.post(path(), barber, andres);
    expect(res.status).toBe(403);
    expect(await CustomerModel.countDocuments({ businessId: { $exists: true } })).toBe(0);
  });

  it("409 con el mismo celular escrito distinto, y devuelve el cliente existente", async () => {
    const first = await api.post(path(), owner, andres);
    const res = await api.post(path(), owner, { name: "Otro", phone: "+57 300-123-4567" });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("CONFLICT");
    expect(res.body.error.details).toEqual({ customerId: first.body.customer.id });
  });

  it.each([
    ["sin celular", { phone: undefined }, "phone"],
    ["celular vacío", { phone: "" }, "phone"],
    ["celular inválido", { phone: "12345" }, "phone"],
    ["nombre de una letra", { name: "A" }, "name"],
  ])("422 %s", async (_caso, override, field) => {
    const res = await api.post(path(), owner, { ...andres, ...override });
    expect(res.status).toBe(422);
    expect(res.body.error.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ path: field })]),
    );
  });

  it("el mismo celular puede existir en otro negocio", async () => {
    const otherOwner = await signUp("otro@ejemplo.com");
    const otherBiz = await createBusinessAs(otherOwner, "otra-barberia");
    await api.post(path(), owner, andres);

    const res = await api.post(`/businesses/${otherBiz}/customers`, otherOwner, andres);
    expect(res.status).toBe(201);
  });
});

describe("GET /customers?q=", () => {
  beforeEach(async () => {
    await api.post(path(), owner, andres);
    await api.post(path(), owner, { name: "Camilo Ríos", phone: "311 555 0000" });
    await api.post(path(), owner, { name: "Andrea Peña", phone: "320 999 8888" });
  });

  it("busca por nombre sin importar tildes ni mayúsculas", async () => {
    const res = await api.get(path("?q=ANDRE"), owner);
    expect(res.status).toBe(200);
    expect(res.body.customers.map((c: { name: string }) => c.name)).toEqual([
      "Andrea Peña",
      "Andrés Gómez",
    ]);
  });

  it("busca por parte del celular", async () => {
    const res = await api.get(path("?q=" + encodeURIComponent("555 00")), owner);
    expect(res.body.customers.map((c: { name: string }) => c.name)).toEqual(["Camilo Ríos"]);
  });

  it("el barbero puede buscar clientes para agendar", async () => {
    const res = await api.get(path("?q=cam"), barber);
    expect(res.status).toBe(200);
    expect(res.body.customers).toHaveLength(1);
  });

  it("los caracteres especiales no rompen la búsqueda", async () => {
    const res = await api.get(path("?q=" + encodeURIComponent(".*(")), owner);
    expect(res.status).toBe(200);
    expect(res.body.customers).toEqual([]);
  });

  it("422 sin búsqueda o con un solo carácter", async () => {
    expect((await api.get(path(), owner)).status).toBe(422);
    expect((await api.get(path("?q=a"), owner)).status).toBe(422);
  });

  it("no muestra clientes de otro negocio", async () => {
    const otherOwner = await signUp("otro@ejemplo.com");
    const otherBiz = await createBusinessAs(otherOwner, "otra-barberia");
    await api.post(`/businesses/${otherBiz}/customers`, otherOwner, {
      name: "Andrés Ajeno",
      phone: "301 000 0000",
    });

    const res = await api.get(path("?q=andres"), owner);
    expect(res.body.customers.map((c: { name: string }) => c.name)).toEqual(["Andrés Gómez"]);
  });
});

describe("GET y PATCH /customers/:id", () => {
  let customerId: string;

  beforeEach(async () => {
    customerId = (await api.post(path(), owner, andres)).body.customer.id;
  });

  it("el owner edita nombre, celular y nota", async () => {
    const res = await api.patch(path(`/${customerId}`), owner, {
      name: "Andrés G.",
      phone: "3009998877",
      note: "Prefiere tijera",
    });
    expect(res.status).toBe(200);
    expect(res.body.customer).toMatchObject({
      name: "Andrés G.",
      phone: "+573009998877",
      note: "Prefiere tijera",
    });
  });

  it("409 al cambiar a un celular de otro cliente", async () => {
    await api.post(path(), owner, { name: "Camilo", phone: "311 555 0000" });
    const res = await api.patch(path(`/${customerId}`), owner, { phone: "3115550000" });
    expect(res.status).toBe(409);
  });

  it("el barbero ve el cliente pero no lo edita", async () => {
    expect((await api.get(path(`/${customerId}`), barber)).status).toBe(200);
    expect((await api.patch(path(`/${customerId}`), barber, { name: "X Y" })).status).toBe(403);
  });

  it("404 con id inválido, inexistente o de otro negocio", async () => {
    const otherOwner = await signUp("otro@ejemplo.com");
    const otherBiz = await createBusinessAs(otherOwner, "otra-barberia");

    expect((await api.get(path("/no-es-id"), owner)).status).toBe(404);
    expect((await api.get(path("/65f0a1b2c3d4e5f6a7b8c9d0"), owner)).status).toBe(404);
    expect(
      (await api.get(`/businesses/${otherBiz}/customers/${customerId}`, otherOwner)).status,
    ).toBe(404);
    expect(
      (
        await api.patch(`/businesses/${otherBiz}/customers/${customerId}`, otherOwner, {
          name: "Robo",
        })
      ).status,
    ).toBe(404);
  });
});

describe("findOrCreateCustomer", () => {
  const ctxOf = (): TenantContext => ({
    businessId: bizId,
    membershipId: "65f0a1b2c3d4e5f6a7b8c9d0",
    role: "owner",
  });

  it("reutiliza el cliente si el celular ya existe y no cambia su nombre", async () => {
    const created = (await api.post(path(), owner, andres)).body.customer;
    const found = await findOrCreateCustomer(ctxOf(), {
      name: "Otro nombre",
      phone: "+573001234567",
    });
    expect(found.id).toBe(created.id);
    expect(found.name).toBe("Andrés Gómez");
  });

  it("crea el cliente si no existe", async () => {
    const created = await findOrCreateCustomer(ctxOf(), {
      name: "Nuevo Cliente",
      phone: "+573007776655",
    });
    expect(created.name).toBe("Nuevo Cliente");
    expect(await CustomerModel.countDocuments({ businessId: { $exists: true } })).toBe(1);
  });
});
