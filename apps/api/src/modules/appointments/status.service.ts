import { Types } from "mongoose";
import {
  nextAppointmentStatus,
  occupiesSchedule,
  type Appointment,
  type AppointmentAction,
  type AppointmentChange,
} from "@barberos/contracts";
import { withTransaction } from "../../shared/db/transaction.js";
import { AppError } from "../../shared/errors/app-error.js";
import type { TenantContext } from "../../shared/middleware/require-permission.js";
import { memberNames } from "../memberships/membership.service.js";
import { AppointmentModel } from "./appointment.model.js";
import {
  businessNow,
  canManageAll,
  canUndoLastChange,
  findVisibleAppointment,
  isStatusAction,
  releaseSlots,
  reserveSlots,
  toAppointment,
} from "./appointment.service.js";

const invalidChange = (message: string) => new AppError(409, "INVALID_STATUS_CHANGE", message);

const undoNotAvailable = () =>
  new AppError(409, "UNDO_NOT_AVAILABLE", "Ya no hay un cambio para deshacer");

export async function changeStatus(
  ctx: TenantContext,
  appointmentId: string,
  action: AppointmentAction,
): Promise<Appointment> {
  const current = await findVisibleAppointment(ctx, appointmentId);
  const next = nextAppointmentStatus(current.status, action);
  if (!next) throw invalidChange("Ese cambio no es posible en el estado actual de la cita");

  const now = await businessNow(ctx);
  if (action === "check_in" && current.date !== now.date) {
    throw invalidChange("Solo puedes marcar la llegada el día de la cita");
  }
  if (action === "no_show" && current.date > now.date) {
    throw invalidChange("No puedes marcar que no vino antes del día de la cita");
  }

  const doc = await withTransaction(async (session) => {
    const updated = await AppointmentModel.findOneAndUpdate(
      {
        businessId: new Types.ObjectId(ctx.businessId),
        _id: current._id,
        status: current.status,
      },
      {
        $set: { status: next },
        $push: {
          history: {
            kind: action,
            at: new Date(),
            byMembershipId: new Types.ObjectId(ctx.membershipId),
            fromStatus: current.status,
            toStatus: next,
          },
        },
      },
      { session, returnDocument: "after", runValidators: true },
    ).lean();
    if (!updated) throw invalidChange("La cita cambió mientras tanto. Recarga la agenda");
    if (!occupiesSchedule(next)) await releaseSlots(ctx, updated._id, session);
    return updated;
  });

  return toAppointment(doc, ctx);
}

export async function undoLastChange(
  ctx: TenantContext,
  appointmentId: string,
): Promise<Appointment> {
  const current = await findVisibleAppointment(ctx, appointmentId);
  const last = current.history.at(-1);
  if (!last || !isStatusAction(last.kind) || !last.fromStatus) throw undoNotAvailable();
  if (!canManageAll(ctx) && last.byMembershipId.toString() !== ctx.membershipId) {
    throw AppError.forbidden("Solo quien hizo el cambio puede deshacerlo");
  }
  if (!canUndoLastChange(current, ctx)) throw undoNotAvailable();
  const previous = last.fromStatus;

  const doc = await withTransaction(async (session) => {
    const updated = await AppointmentModel.findOneAndUpdate(
      {
        businessId: new Types.ObjectId(ctx.businessId),
        _id: current._id,
        status: current.status,
        $expr: { $eq: [{ $size: "$history" }, current.history.length] },
      },
      {
        $set: { status: previous },
        $push: {
          history: {
            kind: "undo",
            at: new Date(),
            byMembershipId: new Types.ObjectId(ctx.membershipId),
            fromStatus: current.status,
            toStatus: previous,
          },
        },
      },
      { session, returnDocument: "after", runValidators: true },
    ).lean();
    if (!updated) throw undoNotAvailable();
    if (!occupiesSchedule(current.status) && occupiesSchedule(previous)) {
      await reserveSlots(ctx, updated, updated.startMinutes, updated.endMinutes, session);
    }
    return updated;
  });

  return toAppointment(doc, ctx);
}

export async function appointmentHistory(
  ctx: TenantContext,
  appointmentId: string,
): Promise<AppointmentChange[]> {
  const doc = await findVisibleAppointment(ctx, appointmentId);
  const names = await memberNames(
    ctx.businessId,
    doc.history.map((h) => h.byMembershipId.toString()),
  );
  return doc.history.map((h) => ({
    kind: h.kind,
    at: h.at.toISOString(),
    byMembershipId: h.byMembershipId.toString(),
    byName: names.get(h.byMembershipId.toString()) ?? "Usuario",
    fromStatus: h.fromStatus ?? null,
    toStatus: h.toStatus,
  }));
}
