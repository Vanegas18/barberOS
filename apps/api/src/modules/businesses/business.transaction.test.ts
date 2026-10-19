import mongoose, { Types } from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { MembershipModel } from "../memberships/membership.model.js";
import { BusinessModel } from "./business.model.js";
import { createBusiness } from "./business.service.js";

let replSet: MongoMemoryReplSet;

beforeAll(async () => {
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(replSet.getUri());
  await BusinessModel.init();
  await MembershipModel.init();
});

afterAll(async () => {
  await mongoose.disconnect();
  await replSet.stop();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("createBusiness (transacción)", () => {
  it("revierte el negocio si falla la creación de la membresía owner", async () => {
    vi.spyOn(MembershipModel, "create").mockRejectedValueOnce(new Error("fallo simulado"));

    await expect(
      createBusiness(new Types.ObjectId().toString(), {
        name: "Barbería Rollback",
        slug: "barberia-rollback",
        currency: "COP",
        timezone: "America/Bogota",
      }),
    ).rejects.toThrow("fallo simulado");

    expect(await BusinessModel.countDocuments({ slug: "barberia-rollback" })).toBe(0);
  });
});
