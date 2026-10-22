import { describe, expect, it } from "vitest";
import { normalizePhone, optionalPhoneSchema } from "@barberos/contracts";

describe("normalizePhone", () => {
  it.each([
    ["3001234567", "+573001234567"],
    ["300 123 4567", "+573001234567"],
    ["(300) 123-4567", "+573001234567"],
    ["573001234567", "+573001234567"],
    ["+57 300 123 4567", "+573001234567"],
    ["+1 415 555 2671", "+14155552671"],
  ])("%s -> %s", (raw, expected) => {
    expect(normalizePhone(raw)).toBe(expected);
  });

  it.each(["123", "6041234567", "+0 300", "abc", "+57300123456789012"])("rechaza %s", (raw) => {
    expect(normalizePhone(raw)).toBeNull();
  });
});

describe("optionalPhoneSchema", () => {
  it("vacío y null quedan en null", () => {
    expect(optionalPhoneSchema.parse("")).toBeNull();
    expect(optionalPhoneSchema.parse("  ")).toBeNull();
    expect(optionalPhoneSchema.parse(null)).toBeNull();
  });

  it("un número inválido es un error de validación", () => {
    expect(optionalPhoneSchema.safeParse("123").success).toBe(false);
  });
});
