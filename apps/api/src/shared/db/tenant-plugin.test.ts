import mongoose, { Schema, Types } from "mongoose";
import { beforeEach, describe, expect, it } from "vitest";
import { useTestDatabase } from "../../../tests/db.js";
import { tenantPlugin } from "./tenant-plugin.js";

interface TenantItemDoc {
  businessId: Types.ObjectId;
  name: string;
}

const itemSchema = new Schema<TenantItemDoc>({ name: { type: String, required: true } });
itemSchema.plugin(tenantPlugin);
const TenantItem = mongoose.model("TenantItem", itemSchema);

const businessA = new Types.ObjectId();
const businessB = new Types.ObjectId();

useTestDatabase();

beforeEach(async () => {
  await TenantItem.deleteMany({}).setOptions({ skipTenantCheck: true });
  await TenantItem.create([
    { businessId: businessA, name: "de A" },
    { businessId: businessB, name: "de B" },
  ]);
});

describe("tenantPlugin: creación", () => {
  it("exige businessId al crear", async () => {
    await expect(TenantItem.create({ name: "sin negocio" })).rejects.toThrow();
  });

  it("no permite cambiar businessId de un documento existente", async () => {
    const doc = await TenantItem.findOne({ businessId: businessA });
    expect(doc).not.toBeNull();
    doc!.set("businessId", businessB);
    await doc!.save();

    const reloaded = await TenantItem.findById(doc!._id).setOptions({ skipTenantCheck: true });
    expect(reloaded!.businessId.toString()).toBe(businessA.toString());
  });
});

describe("tenantPlugin: consultas", () => {
  it("rechaza find sin businessId", async () => {
    await expect(TenantItem.find({ name: "de A" })).rejects.toThrow(/requiere businessId/);
  });

  it("rechaza find con businessId undefined", async () => {
    await expect(TenantItem.find({ businessId: undefined })).rejects.toThrow(/requiere businessId/);
  });

  it("rechaza findOne, updateMany, deleteMany y countDocuments sin businessId", async () => {
    await expect(TenantItem.findOne({})).rejects.toThrow(/requiere businessId/);
    await expect(TenantItem.updateMany({}, { name: "x" })).rejects.toThrow(/requiere businessId/);
    await expect(TenantItem.deleteMany({})).rejects.toThrow(/requiere businessId/);
    await expect(TenantItem.countDocuments({})).rejects.toThrow(/requiere businessId/);
  });

  it("permite consultas con businessId y solo devuelve datos de ese negocio", async () => {
    const itemsA = await TenantItem.find({ businessId: businessA });
    expect(itemsA).toHaveLength(1);
    expect(itemsA[0]!.name).toBe("de A");
  });

  it("acepta businessId dentro de $and", async () => {
    const items = await TenantItem.find({ $and: [{ businessId: businessB }, { name: "de B" }] });
    expect(items).toHaveLength(1);
  });

  it("permite saltar la verificación solo con skipTenantCheck", async () => {
    const all = await TenantItem.find({}).setOptions({ skipTenantCheck: true });
    expect(all).toHaveLength(2);
  });
});

describe("tenantPlugin: aggregate", () => {
  it("rechaza un pipeline sin $match con businessId al inicio", async () => {
    await expect(TenantItem.aggregate([{ $group: { _id: null, n: { $sum: 1 } } }])).rejects.toThrow(
      /requiere que la primera etapa/,
    );
  });

  it("acepta un pipeline que empieza con $match por businessId", async () => {
    const result = await TenantItem.aggregate([
      { $match: { businessId: businessA } },
      { $group: { _id: null, n: { $sum: 1 } } },
    ]);
    expect(result[0].n).toBe(1);
  });
});
