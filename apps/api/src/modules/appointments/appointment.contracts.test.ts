import { describe, expect, it } from "vitest";
import {
  APPOINTMENT_STATUSES,
  WALK_IN_DEFAULT_NAME,
  appointmentEndMinutes,
  createAppointmentSchema,
  hasPermission,
  nextAppointmentStatus,
  occupiesSchedule,
  roundDownToStep,
  scheduleWarnings,
  walkInSchema,
  type Workday,
} from "@barberos/contracts";

const id = "65f0a1b2c3d4e5f6a7b8c9d0";
const workday: Workday = {
  start: "09:00",
  end: "19:00",
  lunch: { start: "13:00", durationMinutes: 90 },
};

describe("estados de la cita", () => {
  it("no incluye confirmed", () => {
    expect(APPOINTMENT_STATUSES).toEqual([
      "pending",
      "in_service",
      "completed",
      "cancelled",
      "no_show",
    ]);
  });

  it.each([
    ["pending", "check_in", "in_service"],
    ["pending", "cancel", "cancelled"],
    ["pending", "no_show", "no_show"],
    ["in_service", "complete", "completed"],
    ["in_service", "cancel", "cancelled"],
  ] as const)("%s + %s -> %s", (from, action, to) => {
    expect(nextAppointmentStatus(from, action)).toBe(to);
  });

  it.each([
    ["pending", "complete"],
    ["in_service", "check_in"],
    ["in_service", "no_show"],
    ["completed", "cancel"],
    ["cancelled", "check_in"],
    ["no_show", "check_in"],
  ] as const)("rechaza %s + %s", (from, action) => {
    expect(nextAppointmentStatus(from, action)).toBeNull();
  });

  it("solo canceladas y no vino liberan el espacio", () => {
    expect(occupiesSchedule("pending")).toBe(true);
    expect(occupiesSchedule("in_service")).toBe(true);
    expect(occupiesSchedule("completed")).toBe(true);
    expect(occupiesSchedule("cancelled")).toBe(false);
    expect(occupiesSchedule("no_show")).toBe(false);
  });
});

describe("tiempos", () => {
  it("redondea hacia abajo al paso de 5", () => {
    expect(roundDownToStep(9 * 60 + 7)).toBe(9 * 60 + 5);
    expect(roundDownToStep(600)).toBe(600);
  });

  it("suma las duraciones de los servicios", () => {
    expect(appointmentEndMinutes("09:00", [30, 15])).toBe(9 * 60 + 45);
  });
});

describe("avisos de horario", () => {
  const at = (h: number, m = 0) => h * 60 + m;

  it("sin avisos dentro de la jornada", () => {
    expect(scheduleWarnings(workday, at(10), at(10, 30))).toEqual([]);
  });

  it("día libre", () => {
    expect(scheduleWarnings(null, at(10), at(10, 30))).toEqual(["day_off"]);
  });

  it("antes de la entrada, después de la salida habitual y en el almuerzo", () => {
    expect(scheduleWarnings(workday, at(8, 30), at(9))).toEqual(["before_start"]);
    expect(scheduleWarnings(workday, at(18, 45), at(19, 15))).toEqual(["after_usual_end"]);
    expect(scheduleWarnings(workday, at(14, 15), at(14, 45))).toEqual(["during_lunch"]);
  });

  it("terminar justo cuando empieza el almuerzo no es aviso", () => {
    expect(scheduleWarnings(workday, at(12, 30), at(13))).toEqual([]);
    expect(scheduleWarnings(workday, at(14, 30), at(15))).toEqual([]);
  });
});

describe("esquemas de cita", () => {
  const base = { employeeId: id, date: "2026-10-27", start: "10:00", serviceIds: [id] };

  it("cita nueva exige nombre y celular del cliente", () => {
    const ok = createAppointmentSchema.safeParse({
      ...base,
      customer: { name: "Andrés", phone: "300 123 4567" },
    });
    expect(ok.success && ok.data.customer).toEqual({ name: "Andrés", phone: "+573001234567" });
    expect(
      createAppointmentSchema.safeParse({ ...base, customer: { name: "Andrés" } }).success,
    ).toBe(false);
  });

  it("acepta un cliente existente por id", () => {
    expect(createAppointmentSchema.safeParse({ ...base, customer: { id } }).success).toBe(true);
  });

  it("rechaza servicios repetidos, vacíos o fuera del paso de 5", () => {
    const customer = { id };
    expect(createAppointmentSchema.safeParse({ ...base, customer, serviceIds: [] }).success).toBe(
      false,
    );
    expect(
      createAppointmentSchema.safeParse({ ...base, customer, serviceIds: [id, id] }).success,
    ).toBe(false);
    expect(createAppointmentSchema.safeParse({ ...base, customer, start: "10:07" }).success).toBe(
      false,
    );
  });

  it("sin cita: nombre y celular opcionales", () => {
    const parsed = walkInSchema.parse({
      outcome: "in_service",
      employeeId: id,
      serviceIds: [id],
      customer: { name: "", phone: "" },
    });
    expect(parsed.customer).toEqual({ name: undefined, phone: null });
    expect(WALK_IN_DEFAULT_NAME).toBe("Cliente de paso");
  });

  it("sin cita: un id inválido no se convierte en cliente de paso", () => {
    expect(
      walkInSchema.safeParse({
        outcome: "in_service",
        employeeId: id,
        serviceIds: [id],
        customer: { id: "malo" },
      }).success,
    ).toBe(false);
  });

  it("ya atendido exige fecha y hora", () => {
    const walkIn = { outcome: "completed", employeeId: id, serviceIds: [id], customer: {} };
    expect(walkInSchema.safeParse(walkIn).success).toBe(false);
    expect(walkInSchema.safeParse({ ...walkIn, date: "2026-10-26", start: "15:00" }).success).toBe(
      true,
    );
  });
});

describe("permisos de citas", () => {
  it("el barbero maneja solo las suyas y no registra días anteriores", () => {
    expect(hasPermission("barber", "appointments:manage_own")).toBe(true);
    expect(hasPermission("barber", "appointments:manage")).toBe(false);
    expect(hasPermission("barber", "appointments:backdate")).toBe(false);
  });

  it("owner y admin manejan todas y registran días anteriores", () => {
    for (const role of ["owner", "admin"] as const) {
      expect(hasPermission(role, "appointments:manage")).toBe(true);
      expect(hasPermission(role, "appointments:backdate")).toBe(true);
    }
  });
});
