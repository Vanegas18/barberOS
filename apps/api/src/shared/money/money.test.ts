import { describe, expect, it } from "vitest";
import { applyBasisPoints, assertMoney, sumMoney } from "./money.js";

describe("applyBasisPoints", () => {
  it("calcula el ejemplo del documento: 60 % de 30.000 = 18.000", () => {
    expect(applyBasisPoints(30_000, 6000)).toBe(18_000);
  });

  it("redondea half-up: 60 % de 1001 = 600,6 -> 601", () => {
    expect(applyBasisPoints(1001, 6000)).toBe(601);
  });

  it("redondea la mitad hacia arriba: 50 % de 1 = 0,5 -> 1", () => {
    expect(applyBasisPoints(1, 5000)).toBe(1);
  });

  it("redondea hacia abajo cuando es menos de la mitad: 33,33 % de 1 -> 0", () => {
    expect(applyBasisPoints(1, 3333)).toBe(0);
  });

  it("0 % da 0 y 100 % devuelve el importe", () => {
    expect(applyBasisPoints(12_345, 0)).toBe(0);
    expect(applyBasisPoints(12_345, 10_000)).toBe(12_345);
  });

  it("rechaza importes decimales o negativos", () => {
    expect(() => applyBasisPoints(10.5, 5000)).toThrow(RangeError);
    expect(() => applyBasisPoints(-1, 5000)).toThrow(RangeError);
  });

  it("rechaza tasas fuera de 0-10000", () => {
    expect(() => applyBasisPoints(1000, -1)).toThrow(RangeError);
    expect(() => applyBasisPoints(1000, 10_001)).toThrow(RangeError);
    expect(() => applyBasisPoints(1000, 60.5)).toThrow(RangeError);
  });
});

describe("sumMoney", () => {
  it("suma importes enteros", () => {
    expect(sumMoney([10_000, 5_000, 2_500])).toBe(17_500);
  });

  it("devuelve 0 para una lista vacía", () => {
    expect(sumMoney([])).toBe(0);
  });

  it("rechaza valores no enteros", () => {
    expect(() => sumMoney([100, 0.1])).toThrow(RangeError);
  });
});

describe("assertMoney", () => {
  it("acepta enteros no negativos", () => {
    expect(() => assertMoney(0)).not.toThrow();
    expect(() => assertMoney(30_000)).not.toThrow();
  });

  it("rechaza NaN e Infinity", () => {
    expect(() => assertMoney(Number.NaN)).toThrow(RangeError);
    expect(() => assertMoney(Number.POSITIVE_INFINITY)).toThrow(RangeError);
  });
});
