import mongoose, { Types } from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { ActivationCodeModel } from "../activation-codes/activation-code.model.js";
import { issueActivationCode } from "../activation-codes/activation-code.service.js";
import { MembershipModel } from "../memberships/membership.model.js";
import { BusinessModel } from "./business.model.js";
import { createBusiness } from "./business.service.js";

let replSet: MongoMemoryReplSet;

beforeAll(async () => {
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(replSet.getUri());
  await BusinessModel.init();
  await MembershipModel.init();
  await ActivationCodeModel.init();
});

afterAll(async () => {
  await mongoose.disconnect();
  await replSet.stop();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("createBusiness (transacción)", () => {
  it("revierte el negocio y libera el código si falla la creación de la membresía owner", async () => {
    const { code, id } = await issueActivationCode({ label: "Rollback" });
    vi.spyOn(MembershipModel, "create").mockRejectedValueOnce(new Error("fallo simulado"));

    await expect(
      createBusiness(new Types.ObjectId().toString(), {
        name: "Barbería Rollback",
        slug: "barberia-rollback",
        activationCode: code,
        currency: "COP",
        timezone: "America/Bogota",
      }),
    ).rejects.toThrow("fallo simulado");

    expect(await BusinessModel.countDocuments({ slug: "barberia-rollback" })).toBe(0);
    const codeDoc = await ActivationCodeModel.findById(id).lean();
    expect(codeDoc?.usedAt).toBeNull();
  });
});
