import { Types } from "mongoose";
import {
  roundDownToStep,
  timeToMinutes,
  type AppointmentWithWarnings,
  type RescheduleAppointmentInput,
} from "@barberos/contracts";
import { withTransaction } from "../../shared/db/transaction.js";
import { AppError } from "../../shared/errors/app-error.js";
import type { TenantContext } from "../../shared/middleware/require-permission.js";
import { findServicesForBooking } from "../services/service.service.js";
import { AppointmentModel, type AppointmentServiceDoc } from "./appointment.model.js";
import {
  assertWithinDay,
  bookableEmployeeFor,
  businessNow,
  fieldError,
  findVisibleAppointment,
  releaseSlots,
  reserveSlots,
  toAppointment,
  warningsFor,
} from "./appointment.service.js";

const onlyPending = () =>
  new AppError(409, "INVALID_STATUS_CHANGE", "Solo se pueden mover citas pendientes");

export async function rescheduleAppointment(
  ctx: TenantContext,
  appointmentId: string,
  input: RescheduleAppointmentInput,
): Promise<AppointmentWithWarnings> {
  const current = await findVisibleAppointment(ctx, appointmentId);
  if (current.status !== "pending") throw onlyPending();

  const employee = await bookableEmployeeFor(
    ctx,
    input.employeeId ?? current.employeeId.toString(),
  );

  const services: AppointmentServiceDoc[] = input.serviceIds
    ? (await findServicesForBooking(ctx, input.serviceIds)).map((s) => ({
        ...s,
        serviceId: new Types.ObjectId(s.serviceId),
      }))
    : current.services;

  const date = input.date ?? current.date;
  const startMinutes = input.start ? timeToMinutes(input.start) : current.startMinutes;
  const endMinutes = startMinutes + services.reduce((sum, s) => sum + s.durationMinutes, 0);
  assertWithinDay(endMinutes);

  const moved =
    employee.id !== current.employeeId.toString() ||
    date !== current.date ||
    startMinutes !== current.startMinutes ||
    endMinutes !== current.endMinutes;

  if (moved) {
    const now = await businessNow(ctx);
    if (date < now.date) throw fieldError("date", "No puedes mover la cita a una fecha pasada");
    if (date === now.date && startMinutes < roundDownToStep(now.minutes)) {
      throw fieldError("start", "Esa hora ya pasó");
    }
  }

  const doc = await withTransaction(async (session) => {
    const updated = await AppointmentModel.findOneAndUpdate(
      {
        businessId: new Types.ObjectId(ctx.businessId),
        _id: current._id,
        status: "pending",
      },
      {
        $set: {
          employeeId: new Types.ObjectId(employee.id),
          services,
          date,
          startMinutes,
          endMinutes,
          ...(input.note !== undefined && { note: input.note || null }),
        },
        ...(moved && {
          $push: {
            history: {
              kind: "rescheduled",
              at: new Date(),
              byMembershipId: new Types.ObjectId(ctx.membershipId),
              fromStatus: "pending",
              toStatus: "pending",
            },
          },
        }),
      },
      { session, returnDocument: "after", runValidators: true },
    ).lean();
    if (!updated) throw onlyPending();
    if (moved) {
      await releaseSlots(ctx, updated._id, session);
      await reserveSlots(ctx, updated, startMinutes, endMinutes, session);
    }
    return updated;
  });

  return {
    appointment: toAppointment(doc),
    warnings: await warningsFor(ctx, employee, date, startMinutes, endMinutes),
  };
}
