import { Types, type ClientSession } from "mongoose";
import {
  CUSTOMER_SEARCH_LIMIT,
  type CreateCustomerInput,
  type Customer,
  type UpdateCustomerInput,
} from "@barberos/contracts";
import { AppError } from "../../shared/errors/app-error.js";
import type { TenantContext } from "../../shared/middleware/require-permission.js";
import { isObjectIdString } from "../memberships/membership.service.js";
import { serviceNameKey } from "../services/service.service.js";
import { CustomerModel, type CustomerDoc } from "./customer.model.js";

type CustomerLean = CustomerDoc & { _id: Types.ObjectId };

export function toCustomer(doc: CustomerLean): Customer {
  return {
    id: doc._id.toString(),
    name: doc.name,
    phone: doc.phone,
    note: doc.note ?? null,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

function isDuplicateKeyError(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: number }).code === 11000;
}

const scope = (ctx: TenantContext) => ({ businessId: new Types.ObjectId(ctx.businessId) });

const notFound = () => AppError.notFound("Cliente no encontrado");

async function duplicatePhone(ctx: TenantContext, phone: string): Promise<AppError> {
  const existing = await CustomerModel.findOne({ ...scope(ctx), phone }, { _id: 1 }).lean();
  return AppError.conflict(
    "Ya existe un cliente con ese celular",
    existing ? { customerId: existing._id.toString() } : undefined,
  );
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function searchFilter(q: string): Record<string, unknown> {
  const digits = q.replace(/\D/g, "");
  if (digits.length >= 3 && !/\p{L}/u.test(q)) {
    return { phone: { $regex: digits } };
  }
  return { nameKey: { $regex: escapeRegex(serviceNameKey(q)) } };
}

export async function searchCustomers(ctx: TenantContext, q: string): Promise<Customer[]> {
  const docs = await CustomerModel.find({ ...scope(ctx), ...searchFilter(q) })
    .collation({ locale: "es", strength: 1 })
    .sort({ name: 1 })
    .limit(CUSTOMER_SEARCH_LIMIT)
    .lean();
  return docs.map(toCustomer);
}

export async function getCustomer(ctx: TenantContext, customerId: string): Promise<Customer> {
  if (!isObjectIdString(customerId)) throw notFound();
  const doc = await CustomerModel.findOne({
    ...scope(ctx),
    _id: new Types.ObjectId(customerId),
  }).lean();
  if (!doc) throw notFound();
  return toCustomer(doc);
}

export async function createCustomer(
  ctx: TenantContext,
  input: CreateCustomerInput,
): Promise<Customer> {
  try {
    const doc = await CustomerModel.create({
      ...scope(ctx),
      name: input.name,
      nameKey: serviceNameKey(input.name),
      phone: input.phone,
      note: input.note || null,
    });
    return toCustomer(doc.toObject());
  } catch (err) {
    if (isDuplicateKeyError(err)) throw await duplicatePhone(ctx, input.phone);
    throw err;
  }
}

export async function updateCustomer(
  ctx: TenantContext,
  customerId: string,
  input: UpdateCustomerInput,
): Promise<Customer> {
  if (!isObjectIdString(customerId)) throw notFound();

  const set: Partial<CustomerDoc> = {};
  if (input.name !== undefined) {
    set.name = input.name;
    set.nameKey = serviceNameKey(input.name);
  }
  if (input.phone !== undefined) set.phone = input.phone;
  if (input.note !== undefined) set.note = input.note || null;

  try {
    const doc = await CustomerModel.findOneAndUpdate(
      { ...scope(ctx), _id: new Types.ObjectId(customerId) },
      { $set: set },
      { returnDocument: "after", runValidators: true },
    ).lean();
    if (!doc) throw notFound();
    return toCustomer(doc);
  } catch (err) {
    if (isDuplicateKeyError(err) && input.phone) throw await duplicatePhone(ctx, input.phone);
    throw err;
  }
}

export async function findCustomerById(
  ctx: TenantContext,
  customerId: string,
  session?: ClientSession,
): Promise<Customer | null> {
  if (!isObjectIdString(customerId)) return null;
  const doc = await CustomerModel.findOne(
    { ...scope(ctx), _id: new Types.ObjectId(customerId) },
    null,
    { session },
  ).lean();
  return doc ? toCustomer(doc) : null;
}

export async function findOrCreateCustomer(
  ctx: TenantContext,
  input: { name: string; phone: string },
  session?: ClientSession,
): Promise<Customer> {
  const existing = await CustomerModel.findOne({ ...scope(ctx), phone: input.phone }, null, {
    session,
  }).lean();
  if (existing) return toCustomer(existing);

  try {
    const [doc] = await CustomerModel.create(
      [
        {
          ...scope(ctx),
          name: input.name,
          nameKey: serviceNameKey(input.name),
          phone: input.phone,
        },
      ],
      { session },
    );
    if (!doc) throw new Error("No se pudo crear el cliente");
    return toCustomer(doc.toObject());
  } catch (err) {
    if (isDuplicateKeyError(err)) {
      throw AppError.conflict("Otro usuario acaba de registrar ese celular. Intenta de nuevo.");
    }
    throw err;
  }
}
