import type { NextFunction, Request, Response } from "express";
import { AppError } from "../../shared/errors/app-error.js";
import { findActiveMembership } from "./membership.service.js";

/**
 * Debe ir DESPUÉS de `authenticate`, en rutas con el parámetro `:businessId`.
 * Sin membresía activa responde 404 (nunca 403) para no revelar que el negocio existe.
 */
export async function tenantContext(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const userId = req.auth?.userId;
  if (!userId) return next(AppError.unauthorized());

  const rawBusinessId = req.params.businessId;
  if (typeof rawBusinessId !== "string") return next(AppError.notFound());

  const businessId = rawBusinessId.toLowerCase();
  const membership = await findActiveMembership(businessId, userId);
  if (!membership) return next(AppError.notFound());

  req.tenant = {
    businessId,
    membershipId: membership.membershipId,
    role: membership.role,
  };
  next();
}
