import { Types, type ClientSession } from "mongoose";
import {
  MINUTES_PER_DAY,
  appointmentEndMinutes,
  hasPermission,
  minutesToTime,
  resolveWorkday,
  roundDownToStep,
  scheduleWarnings,
  timeToMinutes,
  SCHEDULE_STEP_MINUTES,
  type Appointment,
  type AppointmentDayQuery,
  type AppointmentWithWarnings,
  type CreateAppointmentInput,
  type CustomerRef,
} from "@barberos/contracts";
import { withTransaction } from "../../shared/db/transaction.js";
import { AppError } from "../../shared/errors/app-error.js";
import type { TenantContext } from "../../shared/middleware/require-permission.js";
import { nowInTimeZone, type ZonedNow } from "../../shared/time/zoned-clock.js";
import { findBusinessTimezone } from "../businesses/business.service.js";
import { findCustomerById, findOrCreateCustomer } from "../customers/customer.service.js";
import {
  findBookableEmployee,
  findMyEmployeeId,
  type BookableEmployee,
} from "../employees/employee.service.js";
import { isObjectIdString } from "../memberships/membership.service.js";
import { findException } from "../schedules/schedule.service.js";
import { findServicesForBooking } from "../services/service.service.js";
import {
  AppointmentModel,
  type AppointmentCustomerDoc,
  type AppointmentDoc,
} from "./appointment.model.js";
import { AppointmentSlotModel } from "./appointment-slot.model.js";

type AppointmentLean = AppointmentDoc & { _id: Types.ObjectId };

export function toAppointment(doc: AppointmentLean): Appointment {
  return {
    id: doc._id.toString(),
    employeeId: doc.employeeId.toString(),
    customer: {
      id: doc.customer.customerId?.toString() ?? null,
      name: doc.customer.name,
      phone: doc.customer.phone ?? null,
    },
    services: doc.services.map((s) => ({
      serviceId: s.serviceId.toString(),
      name: s.name,
      price: s.price,
      durationMinutes: s.durationMinutes,
    })),
    date: doc.date,
    start: minutesToTime(doc.startMinutes),
    end: minutesToTime(doc.endMinutes),
    status: doc.status,
    source: doc.source,
    recordedAfter: doc.recordedAfter,
    note: doc.note ?? null,
    canUndo: false,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

const scope = (ctx: TenantContext) => ({ businessId: new Types.ObjectId(ctx.businessId) });

const notFound = () => AppError.notFound("Cita no encontrada");

export const fieldError = (path: string, message: string) =>
  AppError.validation([{ part: "body", path, message }]);

export const slotTaken = () =>
  new AppError(409, "SLOT_TAKEN", "Ese horario ya está ocupado para este barbero");

function isDuplicateKeyError(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: number }).code === 11000;
}

export async function businessNow(ctx: TenantContext): Promise<ZonedNow> {
  return nowInTimeZone(await findBusinessTimezone(ctx.businessId));
}

export function canManageAll(ctx: TenantContext): boolean {
  return hasPermission(ctx.role, "appointments:manage");
}

export async function bookableEmployeeFor(
  ctx: TenantContext,
  employeeId: string,
): Promise<BookableEmployee> {
  const employee = await findBookableEmployee(ctx, employeeId);
  if (!employee) throw fieldError("employeeId", "Ese barbero no existe");
  if (!canManageAll(ctx) && !employee.isMe) {
    throw AppError.forbidden("Solo puedes agendar en tu propia agenda");
  }
  if (!employee.active) throw AppError.conflict("Ese barbero está desactivado");
  return employee;
}

export function assertWithinDay(endMinutes: number): void {
  if (endMinutes > MINUTES_PER_DAY) {
    throw fieldError("serviceIds", "La cita debe terminar antes de la medianoche");
  }
}

export async function reserveSlots(
  ctx: TenantContext,
  appointment: { _id: Types.ObjectId; employeeId: Types.ObjectId; date: string },
  startMinutes: number,
  endMinutes: number,
  session: ClientSession,
): Promise<void> {
  const slots = [];
  for (let minute = startMinutes; minute < endMinutes; minute += SCHEDULE_STEP_MINUTES) {
    slots.push({
      ...scope(ctx),
      employeeId: appointment.employeeId,
      date: appointment.date,
      minute,
      appointmentId: appointment._id,
    });
  }
  try {
    await AppointmentSlotModel.create(slots, { session, ordered: true });
  } catch (err) {
    if (isDuplicateKeyError(err)) throw slotTaken();
    throw err;
  }
}

export async function releaseSlots(
  ctx: TenantContext,
  appointmentId: Types.ObjectId,
  session: ClientSession,
): Promise<void> {
  await AppointmentSlotModel.deleteMany({ ...scope(ctx), appointmentId }, { session });
}

async function resolveCustomer(
  ctx: TenantContext,
  ref: CustomerRef,
  session: ClientSession,
): Promise<AppointmentCustomerDoc> {
  if ("id" in ref) {
    const customer = await findCustomerById(ctx, ref.id, session);
    if (!customer) throw fieldError("customer", "Ese cliente no existe");
    return {
      customerId: new Types.ObjectId(customer.id),
      name: customer.name,
      phone: customer.phone,
    };
  }
  const customer = await findOrCreateCustomer(ctx, ref, session);
  return {
    customerId: new Types.ObjectId(customer.id),
    name: customer.name,
    phone: customer.phone,
  };
}

export async function warningsFor(
  ctx: TenantContext,
  employee: BookableEmployee,
  date: string,
  startMinutes: number,
  endMinutes: number,
) {
  const exception = await findException(ctx, employee.id, date);
  const workday = resolveWorkday(employee.weeklySchedule, exception, date);
  return scheduleWarnings(workday, startMinutes, endMinutes);
}

export async function createAppointment(
  ctx: TenantContext,
  input: CreateAppointmentInput,
): Promise<AppointmentWithWarnings> {
  const employee = await bookableEmployeeFor(ctx, input.employeeId);
  const services = await findServicesForBooking(ctx, input.serviceIds);
  const startMinutes = timeToMinutes(input.start);
  const endMinutes = appointmentEndMinutes(
    input.start,
    services.map((s) => s.durationMinutes),
  );
  assertWithinDay(endMinutes);

  const now = await businessNow(ctx);
  if (input.date < now.date) throw fieldError("date", "No puedes agendar en una fecha pasada");
  if (input.date === now.date && startMinutes < roundDownToStep(now.minutes)) {
    throw fieldError("start", "Esa hora ya pasó");
  }

  const doc = await withTransaction(async (session) => {
    const customer = await resolveCustomer(ctx, input.customer, session);
    const [created] = await AppointmentModel.create(
      [
        {
          ...scope(ctx),
          employeeId: new Types.ObjectId(employee.id),
          customer,
          services: services.map((s) => ({ ...s, serviceId: new Types.ObjectId(s.serviceId) })),
          date: input.date,
          startMinutes,
          endMinutes,
          status: "pending",
          source: "internal",
          recordedAfter: false,
          note: input.note || null,
          history: [
            {
              kind: "created",
              at: new Date(),
              byMembershipId: new Types.ObjectId(ctx.membershipId),
              fromStatus: null,
              toStatus: "pending",
            },
          ],
        },
      ],
      { session },
    );
    if (!created) throw new Error("No se pudo crear la cita");
    await reserveSlots(ctx, created, startMinutes, endMinutes, session);
    return created.toObject();
  });

  return {
    appointment: toAppointment(doc),
    warnings: await warningsFor(ctx, employee, input.date, startMinutes, endMinutes),
  };
}

export async function listDay(
  ctx: TenantContext,
  query: AppointmentDayQuery,
): Promise<Appointment[]> {
  let employeeId = query.employeeId;
  if (!hasPermission(ctx.role, "appointments:read")) {
    const mine = await findMyEmployeeId(ctx);
    if (!mine) return [];
    if (employeeId && employeeId !== mine) throw AppError.forbidden();
    employeeId = mine;
  }

  const docs = await AppointmentModel.find({
    ...scope(ctx),
    date: query.date,
    ...(employeeId ? { employeeId: new Types.ObjectId(employeeId) } : {}),
  })
    .sort({ startMinutes: 1, createdAt: 1 })
    .lean();
  return docs.map(toAppointment);
}

export async function findVisibleAppointment(
  ctx: TenantContext,
  appointmentId: string,
): Promise<AppointmentLean> {
  if (!isObjectIdString(appointmentId)) throw notFound();
  const doc = await AppointmentModel.findOne({
    ...scope(ctx),
    _id: new Types.ObjectId(appointmentId),
  }).lean();
  if (!doc) throw notFound();
  if (!hasPermission(ctx.role, "appointments:read")) {
    const mine = await findMyEmployeeId(ctx);
    if (!mine || doc.employeeId.toString() !== mine) throw notFound();
  }
  return doc;
}

export async function getAppointment(
  ctx: TenantContext,
  appointmentId: string,
): Promise<Appointment> {
  return toAppointment(await findVisibleAppointment(ctx, appointmentId));
}
