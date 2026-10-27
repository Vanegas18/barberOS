import type { Request, Response } from "express";
import type {
  AppointmentActionInput,
  AppointmentDayQuery,
  CreateAppointmentInput,
  RescheduleAppointmentInput,
  WalkInInput,
} from "@barberos/contracts";
import { AppError } from "../../shared/errors/app-error.js";
import type { TenantContext } from "../../shared/middleware/require-permission.js";
import { createAppointment, getAppointment, listDay } from "./appointment.service.js";
import { rescheduleAppointment } from "./reschedule.service.js";
import { appointmentHistory, changeStatus, undoLastChange } from "./status.service.js";
import { registerWalkIn } from "./walk-in.service.js";

function tenantOf(req: Request): TenantContext {
  if (!req.tenant) throw AppError.forbidden();
  return req.tenant;
}

function appointmentIdOf(req: Request): string {
  const value = req.params.appointmentId;
  return typeof value === "string" ? value : "";
}

export async function list(req: Request, res: Response): Promise<void> {
  const appointments = await listDay(tenantOf(req), req.validated.query as AppointmentDayQuery);
  res.json({ appointments });
}

export async function show(req: Request, res: Response): Promise<void> {
  const appointment = await getAppointment(tenantOf(req), appointmentIdOf(req));
  res.json({ appointment });
}

export async function create(req: Request, res: Response): Promise<void> {
  const result = await createAppointment(
    tenantOf(req),
    req.validated.body as CreateAppointmentInput,
  );
  res.status(201).json(result);
}

export async function walkIn(req: Request, res: Response): Promise<void> {
  const result = await registerWalkIn(tenantOf(req), req.validated.body as WalkInInput);
  res.status(201).json(result);
}

export async function reschedule(req: Request, res: Response): Promise<void> {
  const result = await rescheduleAppointment(
    tenantOf(req),
    appointmentIdOf(req),
    req.validated.body as RescheduleAppointmentInput,
  );
  res.json(result);
}

export async function act(req: Request, res: Response): Promise<void> {
  const { action } = req.validated.body as AppointmentActionInput;
  const appointment = await changeStatus(tenantOf(req), appointmentIdOf(req), action);
  res.json({ appointment });
}

export async function undo(req: Request, res: Response): Promise<void> {
  const appointment = await undoLastChange(tenantOf(req), appointmentIdOf(req));
  res.json({ appointment });
}

export async function history(req: Request, res: Response): Promise<void> {
  const changes = await appointmentHistory(tenantOf(req), appointmentIdOf(req));
  res.json({ history: changes });
}
