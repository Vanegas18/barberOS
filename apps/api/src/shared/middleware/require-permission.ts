import type { NextFunction, Request, Response } from "express";
import type { Permission, Role } from "@barberos/contracts";
import { hasPermission } from "@barberos/contracts";
import { AppError } from "../errors/app-error.js";

export interface TenantContext {
  businessId: string;
  membershipId: string;
  role: Role;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      tenant?: TenantContext;
    }
  }
}

export function requirePermission(...permissions: Permission[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const tenant = req.tenant;
    if (!tenant) {
      // Si llegamos aquí sin contexto, es un error de programación: la ruta olvidó tenantContext.
      return next(AppError.forbidden());
    }

    // Basta con tener UNO de los permisos listados.
    const allowed = permissions.some((p) => hasPermission(tenant.role, p));
    if (!allowed) return next(AppError.forbidden());

    next();
  };
}
