import { Types, type ClientSession } from "mongoose";
import {
  WALK_IN_DEFAULT_NAME,
  hasPermission,
  roundDownToStep,
  timeToMinutes,
  type AppointmentWithWarnings,
  type Customer,
  type WalkInCustomer,
  type WalkInInput,
} from "@barberos/contracts";
import { withTransaction } from "../../shared/db/transaction.js";
import { AppError } from "../../shared/errors/app-error.js";
import type { TenantContext } from "../../shared/middleware/require-permission.js";
import {
  findCustomerById,
  findCustomerByPhone,
  findOrCreateCustomer,
} from "../customers/customer.service.js";
import { findServicesForBooking } from "../services/service.service.js";
import { AppointmentModel, type AppointmentCustomerDoc } from "./appointment.model.js";
import {
  assertWithinDay,
  bookableEmployeeFor,
  businessNow,
  fieldError,
  reserveSlots,
  toAppointment,
  warningsFor,
} from "./appointment.service.js";

const linked = (customer: Customer): AppointmentCustomerDoc => ({
  customerId: new Types.ObjectId(customer.id),
  name: customer.name,
  phone: customer.phone,
});

async function resolveWalkInCustomer(
  ctx: TenantContext,
  ref: WalkInCustomer,
  session: ClientSession,
): Promise<AppointmentCustomerDoc> {
  if ("id" in ref) {
    const customer = await findCustomerById(ctx, ref.id, session);
    if (!customer) throw fieldError("customer", "Ese cliente no existe");
    return linked(customer);
  }
  if (ref.phone && ref.name) {
    return linked(await findOrCreateCustomer(ctx, { name: ref.name, phone: ref.phone }, session));
  }
  if (ref.phone) {
    const existing = await findCustomerByPhone(ctx, ref.phone, session);
    if (existing) return linked(existing);
    return { customerId: null, name: WALK_IN_DEFAULT_NAME, phone: ref.phone };
  }
  return { customerId: null, name: ref.name ?? WALK_IN_DEFAULT_NAME, phone: null };
}

export async function registerWalkIn(
  ctx: TenantContext,
  input: WalkInInput,
): Promise<AppointmentWithWarnings> {
  const employee = await bookableEmployeeFor(ctx, input.employeeId);
  const services = await findServicesForBooking(ctx, input.serviceIds);
  const durations = services.map((s) => s.durationMinutes);
  const now = await businessNow(ctx);

  let date: string;
  let startMinutes: number;
  if (input.outcome === "in_service") {
    date = now.date;
    startMinutes = roundDownToStep(now.minutes);
  } else {
    date = input.date;
    startMinutes = timeToMinutes(input.start);
    if (date > now.date) {
      throw fieldError("date", "No puedes registrar una atención en una fecha futura");
    }
    if (date < now.date && !hasPermission(ctx.role, "appointments:backdate")) {
      throw AppError.forbidden("Solo puedes registrar atenciones de hoy");
    }
  }

  const endMinutes = startMinutes + durations.reduce((sum, d) => sum + d, 0);
  assertWithinDay(endMinutes);
  if (input.outcome === "completed" && date === now.date && endMinutes > now.minutes) {
    throw fieldError("start", "Esa atención todavía no ha terminado");
  }

  const doc = await withTransaction(async (session) => {
    const customer = await resolveWalkInCustomer(ctx, input.customer, session);
    const [created] = await AppointmentModel.create(
      [
        {
          businessId: new Types.ObjectId(ctx.businessId),
          employeeId: new Types.ObjectId(employee.id),
          customer,
          services: services.map((s) => ({ ...s, serviceId: new Types.ObjectId(s.serviceId) })),
          date,
          startMinutes,
          endMinutes,
          status: input.outcome,
          source: "walk_in",
          recordedAfter: input.outcome === "completed",
          note: input.note || null,
          history: [
            {
              kind: "created",
              at: new Date(),
              byMembershipId: new Types.ObjectId(ctx.membershipId),
              fromStatus: null,
              toStatus: input.outcome,
            },
          ],
        },
      ],
      { session },
    );
    if (!created) throw new Error("No se pudo registrar la atención");
    await reserveSlots(ctx, created, startMinutes, endMinutes, session);
    return created.toObject();
  });

  return {
    appointment: toAppointment(doc),
    warnings: await warningsFor(ctx, employee, date, startMinutes, endMinutes),
  };
}
