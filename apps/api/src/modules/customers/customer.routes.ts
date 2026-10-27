import { Router } from "express";
import {
  createCustomerSchema,
  customerSearchQuerySchema,
  updateCustomerSchema,
} from "@barberos/contracts";
import { requirePermission } from "../../shared/middleware/require-permission.js";
import { validate } from "../../shared/middleware/validate.js";
import { create, search, show, update } from "./customer.controller.js";

export const customerRouter = Router({ mergeParams: true });

customerRouter.get(
  "/",
  requirePermission("customers:read"),
  validate({ query: customerSearchQuerySchema }),
  search,
);
customerRouter.get("/:customerId", requirePermission("customers:read"), show);
customerRouter.post(
  "/",
  requirePermission("customers:manage"),
  validate({ body: createCustomerSchema }),
  create,
);
customerRouter.patch(
  "/:customerId",
  requirePermission("customers:manage"),
  validate({ body: updateCustomerSchema }),
  update,
);
