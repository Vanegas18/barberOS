import mongoose, { Schema } from "mongoose";
import { beforeEach, describe, expect, it } from "vitest";
import { useTestDatabase } from "../../../tests/db.js";
import { withTransaction } from "./transaction.js";

const TxItem = mongoose.model("TxItem", new Schema({ name: { type: String, required: true } }));

useTestDatabase();

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
