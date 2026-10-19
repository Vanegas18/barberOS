import mongoose, { Types } from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { BusinessModel } from "../businesses/business.model.js";
import { MembershipModel } from "./membership.model.js";

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

beforeEach(async () => {
  await BusinessModel.deleteMany({});
  await MembershipModel.deleteMany({}).setOptions({ skipTenantCheck: true });
});

const newBusiness = (slug: string) =>
  BusinessModel.create({ name: slug, slug, currency: "COP", timezone: "America/Bogota" });

describe("BusinessModel", () => {
  it("no permite dos negocios con el mismo slug", async () => {
    await newBusiness("barberia-uno");
    await expect(newBusiness("barberia-uno")).rejects.toThrow(/duplicate key/i);
  });
});

describe("MembershipModel", () => {
  it("exige businessId", async () => {
    await expect(
      MembershipModel.create({ userId: new Types.ObjectId(), role: "owner" }),
    ).rejects.toThrow();
  });

  it("no permite dos membresías del mismo usuario en el mismo negocio", async () => {
    const business = await newBusiness("barberia-uno");
    const userId = new Types.ObjectId();
    await MembershipModel.create({ businessId: business._id, userId, role: "owner" });
    await expect(
      MembershipModel.create({ businessId: business._id, userId, role: "admin" }),
    ).rejects.toThrow(/duplicate key/i);
  });

  it("permite al mismo usuario tener roles distintos en negocios distintos", async () => {
    const a = await newBusiness("barberia-a");
    const b = await newBusiness("barberia-b");
    const userId = new Types.ObjectId();
    await MembershipModel.create({ businessId: a._id, userId, role: "owner" });
    await MembershipModel.create({ businessId: b._id, userId, role: "barber" });

    const all = await MembershipModel.find({ userId }).setOptions({ skipTenantCheck: true });
    expect(all.map((m) => m.role).sort()).toEqual(["barber", "owner"]);
  });
});
