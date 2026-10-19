import { Router } from "express";
import { createBusinessSchema, updateBusinessSchema } from "@barberos/contracts";
import { requirePermission } from "../../shared/middleware/require-permission.js";
import { validate } from "../../shared/middleware/validate.js";
import { authenticate } from "../auth/authenticate.middleware.js";
import { create, listMine, show, update } from "./business.controller.js";

export const businessRouter = Router();
export const meRouter = Router();

businessRouter.post("/", authenticate, validate({ body: createBusinessSchema }), create);
meRouter.get("/businesses", authenticate, listMine);

/** Se monta bajo /businesses/:businessId, DESPUÉS de authenticate y tenantContext. */
export const businessTenantRouter = Router({ mergeParams: true });

businessTenantRouter.get("/", requirePermission("business:read"), show);
businessTenantRouter.patch(
  "/",
  requirePermission("business:update"),
  validate({ body: updateBusinessSchema }),
  update,
);
