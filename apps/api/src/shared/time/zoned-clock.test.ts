import { describe, expect, it } from "vitest";
import { nowInTimeZone } from "./zoned-clock.js";

describe("nowInTimeZone", () => {
  it("convierte UTC a la hora local del negocio", () => {
    expect(nowInTimeZone("America/Bogota", new Date("2026-10-27T15:07:00Z"))).toEqual({
      date: "2026-10-27",
      minutes: 10 * 60 + 7,
    });
  });

  it("cambia de día según la zona", () => {
    expect(nowInTimeZone("America/Bogota", new Date("2026-10-28T03:30:00Z"))).toEqual({
      date: "2026-10-27",
      minutes: 22 * 60 + 30,
    });
  });

  it("la medianoche es el minuto 0", () => {
    expect(nowInTimeZone("America/Bogota", new Date("2026-10-27T05:00:00Z")).minutes).toBe(0);
  });
});
