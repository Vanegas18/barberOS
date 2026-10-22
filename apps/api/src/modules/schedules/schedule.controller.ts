import type { Request, Response } from "express";
import { hasPermission } from "@barberos/contracts";
import type { ScheduleExceptionInput, WeeklySchedule } from "@barberos/contracts";
import { AppError } from "../../shared/errors/app-error.js";
import type { TenantContext } from "../../shared/middleware/require-permission.js";
import { findEmployeeRef, setWeeklySchedule } from "../employees/employee.service.js";
import { deleteException, listExceptions, upsertException } from "./schedule.service.js";

function tenantOf(req: Request): TenantContext {
  if (!req.tenant) throw AppError.forbidden();
  return req.tenant;
}

function param(req: Request, name: string): string {
  const value = req.params[name];
  return typeof value === "string" ? value : "";
}

async function employeeOf(ctx: TenantContext, req: Request) {
  const employee = await findEmployeeRef(ctx, param(req, "employeeId"));
  if (!employee) throw AppError.notFound("Empleado no encontrado");
  return employee;
}

export async function putWeekly(req: Request, res: Response): Promise<void> {
  const ctx = tenantOf(req);
  const employee = await setWeeklySchedule(
    ctx,
    param(req, "employeeId"),
    req.validated.body as WeeklySchedule,
  );
  res.json({ employee });
}

export async function list(req: Request, res: Response): Promise<void> {
  const ctx = tenantOf(req);
  const employee = await employeeOf(ctx, req);
  if (!employee.isMe && !hasPermission(ctx.role, "employees:read")) throw AppError.forbidden();

  const range = req.validated.query as { from: string; to: string };
  const exceptions = await listExceptions(ctx, employee.id, range);
  res.json({ exceptions });
}

export async function put(req: Request, res: Response): Promise<void> {
  const ctx = tenantOf(req);
  const employee = await employeeOf(ctx, req);
  const { date } = req.validated.params as { date: string };
  const exception = await upsertException(
    ctx,
    employee.id,
    date,
    req.validated.body as ScheduleExceptionInput,
  );
  res.json({ exception });
}

export async function remove(req: Request, res: Response): Promise<void> {
  const ctx = tenantOf(req);
  const employee = await employeeOf(ctx, req);
  const { date } = req.validated.params as { date: string };
  const existed = await deleteException(ctx, employee.id, date);
  if (!existed) throw AppError.notFound("Ese día no tiene un horario especial");
  res.status(204).end();
}
