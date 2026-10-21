import type { NextFunction, Request, Response } from "express";
import { AppError } from "../../shared/errors/app-error.js";
import { getBusinessAccess } from "../businesses/business.service.js";
import { findActiveMembership } from "./membership.service.js";

/**
 * Debe ir DESPUÉS de `authenticate`, en rutas con el parámetro `:businessId`.
 * 1. Sin membresía activa → 404 (nunca 403) para no revelar que el negocio existe.
 * 2. Con membresía, si el negocio está suspendido o su prueba venció → 403 con código propio,
 *    para que el frontend muestre la pantalla correcta. Solo los miembros llegan a saberlo.
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

  const access = await getBusinessAccess(businessId);
  if (!access) return next(AppError.notFound());
  if (access === "suspended") {
    return next(
      new AppError(403, "BUSINESS_SUSPENDED", "Este negocio está suspendido. Contacta a soporte."),
    );
  }
  if (access === "trial_expired") {
    return next(
      new AppError(403, "TRIAL_EXPIRED", "El periodo de prueba de este negocio terminó."),
    );
  }

  req.tenant = {
    businessId,
    membershipId: membership.membershipId,
    role: membership.role,
  };
  next();
}
