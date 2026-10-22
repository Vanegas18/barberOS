import { describe, expect, it } from "vitest";
import {
  DEFAULT_WEEKLY_SCHEDULE,
  calendarDateSchema,
  exceptionRangeQuerySchema,
  minutesToTime,
  resolveWorkday,
  timeSchema,
  timeToMinutes,
  weekdayOf,
  workdaySchema,
} from "@barberos/contracts";

describe("horas", () => {
  it("convierte entre HH:mm y minutos", () => {
    expect(timeToMinutes("09:30")).toBe(570);
    expect(minutesToTime(570)).toBe("09:30");
    expect(timeToMinutes("24:00")).toBe(1440);
  });

  it.each(["09:00", "13:35", "00:00", "24:00"])("acepta %s", (t) => {
    expect(timeSchema.safeParse(t).success).toBe(true);
  });

  it.each(["9:00", "09:07", "25:00", "24:05", "09:60", "nueve"])("rechaza %s", (t) => {
    expect(timeSchema.safeParse(t).success).toBe(false);
  });
});

describe("workdaySchema", () => {
  const day = { start: "09:00", end: "19:00", lunch: { start: "13:00", durationMinutes: 90 } };

  it("acepta una jornada con almuerzo de hora y media", () => {
    expect(workdaySchema.safeParse(day).success).toBe(true);
  });

  it("acepta una jornada sin almuerzo", () => {
    expect(workdaySchema.safeParse({ ...day, lunch: null }).success).toBe(true);
  });

  it("rechaza salida antes de la entrada", () => {
    const r = workdaySchema.safeParse({ ...day, start: "19:00", end: "09:00" });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.path).toEqual(["end"]);
  });

  it("rechaza un almuerzo que se sale de la jornada", () => {
    const r = workdaySchema.safeParse({
      ...day,
      end: "14:00",
      lunch: { start: "13:00", durationMinutes: 120 },
    });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.path).toEqual(["lunch", "start"]);
  });

  it.each([10, 185, 92])("rechaza almuerzo de %i minutos", (durationMinutes) => {
    const r = workdaySchema.safeParse({ ...day, lunch: { start: "13:00", durationMinutes } });
    expect(r.success).toBe(false);
  });
});

describe("fechas", () => {
  it.each([
    ["2026-10-19", "monday"],
    ["2026-10-24", "saturday"],
    ["2026-10-25", "sunday"],
    ["2024-02-29", "thursday"],
  ])("%s es %s", (date, weekday) => {
    expect(weekdayOf(date)).toBe(weekday);
  });

  it.each(["2026-02-30", "2026-13-01", "26-10-19", "2026/10/19"])("rechaza %s", (d) => {
    expect(calendarDateSchema.safeParse(d).success).toBe(false);
  });

  it("limita las consultas a 3 meses y exige orden", () => {
    const ok = exceptionRangeQuerySchema.safeParse({ from: "2026-10-01", to: "2026-12-31" });
    const tooLong = exceptionRangeQuerySchema.safeParse({ from: "2026-10-01", to: "2027-02-01" });
    const reversed = exceptionRangeQuerySchema.safeParse({ from: "2026-10-10", to: "2026-10-01" });
    expect([ok.success, tooLong.success, reversed.success]).toEqual([true, false, false]);
  });
});

describe("resolveWorkday", () => {
  it("sin excepción usa la semana tipo", () => {
    expect(resolveWorkday(DEFAULT_WEEKLY_SCHEDULE, null, "2026-10-19")).toEqual(
      DEFAULT_WEEKLY_SCHEDULE.monday,
    );
    expect(resolveWorkday(DEFAULT_WEEKLY_SCHEDULE, null, "2026-10-25")).toBeNull();
  });

  it("la excepción manda: día libre u otro horario", () => {
    const quincena = { start: "09:00", end: "21:00", lunch: null };
    expect(resolveWorkday(DEFAULT_WEEKLY_SCHEDULE, { workday: null }, "2026-10-19")).toBeNull();
    expect(resolveWorkday(DEFAULT_WEEKLY_SCHEDULE, { workday: quincena }, "2026-10-25")).toEqual(
      quincena,
    );
  });
});
