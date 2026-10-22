import { Router } from "express";
import { createEmployeeSchema, updateEmployeeSchema } from "@barberos/contracts";
import { requirePermission } from "../../shared/middleware/require-permission.js";
import { validate } from "../../shared/middleware/validate.js";
import { create, list, show, showMe, update } from "./employee.controller.js";

export const employeeRouter = Router({ mergeParams: true });

employeeRouter.get("/me", requirePermission("business:read"), showMe);
employeeRouter.get("/", requirePermission("employees:read"), list);
employeeRouter.get("/:employeeId", requirePermission("employees:read"), show);
employeeRouter.post(
  "/",
  requirePermission("employees:manage"),
  validate({ body: createEmployeeSchema }),
  create,
);
employeeRouter.patch(
  "/:employeeId",
  requirePermission("employees:manage"),
  validate({ body: updateEmployeeSchema }),
  update,
);
