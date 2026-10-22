import type { Request, Response } from "express";
import { hasPermission } from "@barberos/contracts";
import type { CreateEmployeeInput, UpdateEmployeeInput } from "@barberos/contracts";
import { AppError } from "../../shared/errors/app-error.js";
import type { TenantContext } from "../../shared/middleware/require-permission.js";
import {
  createEmployee,
  getEmployee,
  getMyEmployee,
  listEmployees,
  updateEmployee,
} from "./employee.service.js";

function tenantOf(req: Request): TenantContext {
  if (!req.tenant) throw AppError.forbidden();
  return req.tenant;
}

function employeeIdOf(req: Request): string {
  const value = req.params.employeeId;
  return typeof value === "string" ? value : "";
}

function assertCanConfigureEarnings(ctx: TenantContext, body: { earningRule?: unknown }): void {
  if (body.earningRule !== undefined && !hasPermission(ctx.role, "earnings:configure")) {
    throw AppError.forbidden("Solo el dueño puede definir cuánto gana cada empleado");
  }
}

export async function list(req: Request, res: Response): Promise<void> {
  const employees = await listEmployees(tenantOf(req));
  res.json({ employees });
}

export async function show(req: Request, res: Response): Promise<void> {
  const employee = await getEmployee(tenantOf(req), employeeIdOf(req));
  res.json({ employee });
}

export async function showMe(req: Request, res: Response): Promise<void> {
  const employee = await getMyEmployee(tenantOf(req));
  res.json({ employee });
}

export async function create(req: Request, res: Response): Promise<void> {
  const ctx = tenantOf(req);
  const input = req.validated.body as CreateEmployeeInput;
  assertCanConfigureEarnings(ctx, input);
  const employee = await createEmployee(ctx, input);
  res.status(201).json({ employee });
}

export async function update(req: Request, res: Response): Promise<void> {
  const ctx = tenantOf(req);
  const input = req.validated.body as UpdateEmployeeInput;
  assertCanConfigureEarnings(ctx, input);
  const employee = await updateEmployee(ctx, employeeIdOf(req), input);
  res.json({ employee });
}
