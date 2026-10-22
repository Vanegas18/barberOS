import type { Request, Response } from "express";
import { hasPermission } from "@barberos/contracts";
import type { CreateServiceInput, UpdateServiceInput } from "@barberos/contracts";
import { AppError } from "../../shared/errors/app-error.js";
import type { TenantContext } from "../../shared/middleware/require-permission.js";
import { createService, getService, listServices, updateService } from "./service.service.js";

function tenantOf(req: Request): TenantContext {
  if (!req.tenant) throw AppError.forbidden();
  return req.tenant;
}

const visibilityFor = (ctx: TenantContext) => ({
  includeInactive: hasPermission(ctx.role, "services:manage"),
});

function serviceIdOf(req: Request): string {
  const value = req.params.serviceId;
  return typeof value === "string" ? value : "";
}

export async function list(req: Request, res: Response): Promise<void> {
  const ctx = tenantOf(req);
  const services = await listServices(ctx, visibilityFor(ctx));
  res.json({ services });
}

export async function show(req: Request, res: Response): Promise<void> {
  const ctx = tenantOf(req);
  const service = await getService(ctx, serviceIdOf(req), visibilityFor(ctx));
  res.json({ service });
}

export async function create(req: Request, res: Response): Promise<void> {
  const ctx = tenantOf(req);
  const service = await createService(ctx, req.validated.body as CreateServiceInput);
  res.status(201).json({ service });
}

export async function update(req: Request, res: Response): Promise<void> {
  const ctx = tenantOf(req);
  const service = await updateService(
    ctx,
    serviceIdOf(req),
    req.validated.body as UpdateServiceInput,
  );
  res.json({ service });
}
