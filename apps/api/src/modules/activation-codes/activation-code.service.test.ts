import mongoose, { Types } from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { withTransaction } from "../../shared/db/transaction.js";
import { ActivationCodeModel } from "./activation-code.model.js";
import {
  consumeActivationCode,
  formatActivationCode,
  issueActivationCode,
  normalizeActivationCode,
} from "./activation-code.service.js";

const CODE_FORMAT = /^BRB-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$/;

describe("normalizeActivationCode", () => {
  it("acepta el formato con prefijo y guiones", () => {
    expect(normalizeActivationCode("BRB-7K2M-Q9XD-4F8T")).toBe("7K2MQ9XD4F8T");
  });

  it("acepta minúsculas, espacios y sin prefijo", () => {
    expect(normalizeActivationCode("  7k2m q9xd 4f8t ")).toBe("7K2MQ9XD4F8T");
  });

  it("corrige confusiones típicas: O→0, I/L→1", () => {
    expect(normalizeActivationCode("BRB-OK2M-Q9XD-4FIL")).toBe("0K2MQ9XD4F11");
  });

  it.each(["", "BRB-7K2M", "BRB-7K2M-Q9XD-4F8T-XXXX", "7K2M-Q9XD-4F8U"])("rechaza %j", (raw) => {
    expect(normalizeActivationCode(raw)).toBeNull();
  });

  it("formatActivationCode es la inversa de normalizeActivationCode", () => {
    expect(formatActivationCode("7K2MQ9XD4F8T")).toBe("BRB-7K2M-Q9XD-4F8T");
  });
});

describe("emisión y consumo", () => {
  let replSet: MongoMemoryReplSet;

  beforeAll(async () => {
    replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    await mongoose.connect(replSet.getUri());
    await ActivationCodeModel.init();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await replSet.stop();
  });

  beforeEach(async () => {
    await ActivationCodeModel.deleteMany({});
  });

  const usage = () => ({
    userId: new Types.ObjectId().toString(),
    businessId: new Types.ObjectId().toString(),
  });

  const consume = (code: string) =>
    withTransaction((session) => consumeActivationCode(code, usage(), session));

  it("emite un código con formato BRB y guarda solo el hash", async () => {
    const issued = await issueActivationCode({ label: "Barbería X", trialDays: 15 });
    expect(issued.code).toMatch(CODE_FORMAT);

    const doc = await ActivationCodeModel.findById(issued.id).lean();
    expect(doc?.codeHash).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(doc)).not.toContain(issued.code.replaceAll("-", "").slice(3));
    expect(doc?.usedAt).toBeNull();
  });

  it("un código válido se consume una vez y devuelve los días de prueba", async () => {
    const { code } = await issueActivationCode({ label: "X", trialDays: 15 });
    await expect(consume(code)).resolves.toEqual({ trialDays: 15 });

    const doc = await ActivationCodeModel.findOne({}).lean();
    expect(doc?.usedAt).toBeInstanceOf(Date);
    expect(doc?.usedForBusinessId).not.toBeNull();
  });

  it("acepta el código escrito en minúsculas y sin guiones", async () => {
    const { code } = await issueActivationCode({ label: "X" });
    await expect(consume(code.toLowerCase().replaceAll("-", ""))).resolves.toEqual({
      trialDays: 0,
    });
  });

  it("un código usado no se puede volver a usar", async () => {
    const { code } = await issueActivationCode({ label: "X" });
    await consume(code);
    await expect(consume(code)).rejects.toMatchObject({
      status: 422,
      code: "INVALID_ACTIVATION_CODE",
    });
  });

  it("un código vencido se rechaza", async () => {
    const { code, id } = await issueActivationCode({ label: "X" });
    await ActivationCodeModel.updateOne({ _id: id }, { expiresAt: new Date(Date.now() - 1000) });
    await expect(consume(code)).rejects.toMatchObject({ code: "INVALID_ACTIVATION_CODE" });
  });

  it("un código inexistente o mal formado se rechaza con el mismo error", async () => {
    const missing = await consume("BRB-0000-0000-0000").catch((e: unknown) => e);
    const malformed = await consume("hola").catch((e: unknown) => e);
    expect(missing).toMatchObject({ code: "INVALID_ACTIVATION_CODE" });
    expect(malformed).toMatchObject({ code: "INVALID_ACTIVATION_CODE" });
    expect((missing as Error).message).toBe((malformed as Error).message);
  });

  it("si la transacción falla después de consumirlo, el código vuelve a estar disponible", async () => {
    const { code } = await issueActivationCode({ label: "X" });
    await expect(
      withTransaction(async (session) => {
        await consumeActivationCode(code, usage(), session);
        throw new Error("fallo posterior");
      }),
    ).rejects.toThrow("fallo posterior");

    await expect(consume(code)).resolves.toEqual({ trialDays: 0 });
  });
});
