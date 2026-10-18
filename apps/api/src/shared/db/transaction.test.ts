import mongoose, { Schema } from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { withTransaction } from "./transaction.js";

const TxItem = mongoose.model("TxItem", new Schema({ name: { type: String, required: true } }));

let replSet: MongoMemoryReplSet;

beforeAll(async () => {
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(replSet.getUri());
  await TxItem.createCollection();
});

afterAll(async () => {
  await mongoose.disconnect();
  await replSet.stop();
});

beforeEach(async () => {
  await TxItem.deleteMany({});
});

describe("withTransaction", () => {
  it("confirma todas las escrituras cuando no hay error", async () => {
    await withTransaction(async (session) => {
      await TxItem.create([{ name: "a" }], { session });
      await TxItem.create([{ name: "b" }], { session });
    });

    expect(await TxItem.countDocuments()).toBe(2);
  });

  it("deshace todo (rollback) cuando una operación falla", async () => {
    await expect(
      withTransaction(async (session) => {
        await TxItem.create([{ name: "a" }], { session });
        throw new Error("fallo simulado");
      }),
    ).rejects.toThrow("fallo simulado");

    expect(await TxItem.countDocuments()).toBe(0);
  });

  it("devuelve el valor que retorna la función", async () => {
    const result = await withTransaction(async () => 42);
    expect(result).toBe(42);
  });
});
