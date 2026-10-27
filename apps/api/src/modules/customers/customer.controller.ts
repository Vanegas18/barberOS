import type { Request, Response } from "express";
import type {
  CreateCustomerInput,
  CustomerSearchQuery,
  UpdateCustomerInput,
} from "@barberos/contracts";
import { AppError } from "../../shared/errors/app-error.js";
import type { TenantContext } from "../../shared/middleware/require-permission.js";
import {
  createCustomer,
  getCustomer,
  searchCustomers,
  updateCustomer,
} from "./customer.service.js";

function tenantOf(req: Request): TenantContext {
  if (!req.tenant) throw AppError.forbidden();
  return req.tenant;
}

function customerIdOf(req: Request): string {
  const value = req.params.customerId;
  return typeof value === "string" ? value : "";
}

export async function search(req: Request, res: Response): Promise<void> {
  const { q } = req.validated.query as CustomerSearchQuery;
  const customers = await searchCustomers(tenantOf(req), q);
  res.json({ customers });
}

export async function show(req: Request, res: Response): Promise<void> {
  const customer = await getCustomer(tenantOf(req), customerIdOf(req));
  res.json({ customer });
}

export async function create(req: Request, res: Response): Promise<void> {
  const customer = await createCustomer(tenantOf(req), req.validated.body as CreateCustomerInput);
  res.status(201).json({ customer });
}

export async function update(req: Request, res: Response): Promise<void> {
  const customer = await updateCustomer(
    tenantOf(req),
    customerIdOf(req),
    req.validated.body as UpdateCustomerInput,
  );
  res.json({ customer });
}
