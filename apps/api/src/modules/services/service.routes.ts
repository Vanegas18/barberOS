import { Router } from "express";
import { createServiceSchema, updateServiceSchema } from "@barberos/contracts";
import { requirePermission } from "../../shared/middleware/require-permission.js";
import { validate } from "../../shared/middleware/validate.js";
import { create, list, show, update } from "./service.controller.js";

export const serviceRouter = Router({ mergeParams: true });

serviceRouter.get("/", requirePermission("services:read"), list);
serviceRouter.get("/:serviceId", requirePermission("services:read"), show);
serviceRouter.post(
  "/",
  requirePermission("services:manage"),
  validate({ body: createServiceSchema }),
  create,
);
serviceRouter.patch(
  "/:serviceId",
  requirePermission("services:manage"),
  validate({ body: updateServiceSchema }),
  update,
);
