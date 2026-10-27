import type { Request, Response } from "express";
import type { AppointmentDayQuery, CreateAppointmentInput } from "@barberos/contracts";
import { AppError } from "../../shared/errors/app-error.js";
import type { TenantContext } from "../../shared/middleware/require-permission.js";
import { createAppointment, getAppointment, listDay } from "./appointment.service.js";

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
