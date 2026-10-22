import { Types } from "mongoose";
import type {
  CreateEmployeeInput,
  EarningRule,
  Employee,
  UpdateEmployeeInput,
} from "@barberos/contracts";
import { AppError } from "../../shared/errors/app-error.js";
import type { TenantContext } from "../../shared/middleware/require-permission.js";
import { isObjectIdString } from "../memberships/membership.service.js";
import { EmployeeModel, type EarningRuleDoc, type EmployeeDoc } from "./employee.model.js";

export function employeeNameKey(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function toRuleDoc(rule: EarningRule): EarningRuleDoc {
  if (rule.type === "percentage") return { type: "percentage", rateBp: rule.rateBp };
  if (rule.type === "fixed") return { type: "fixed", amount: rule.amount };
  return { type: "none" };
}

function toRule(doc: EarningRuleDoc): EarningRule {
  if (doc.type === "percentage") return { type: "percentage", rateBp: doc.rateBp ?? 0 };
  if (doc.type === "fixed") return { type: "fixed", amount: doc.amount ?? 0 };
  return { type: "none" };
}

function toEmployee(doc: EmployeeDoc & { _id: Types.ObjectId }, ctx: TenantContext): Employee {
  return {
    id: doc._id.toString(),
    displayName: doc.displayName,
    phone: doc.phone ?? null,
    earningRule: toRule(doc.earningRule),
    acceptsOnlineBookings: doc.acceptsOnlineBookings,
    active: doc.active,
    hasAccount: doc.membershipId !== null && doc.membershipId !== undefined,
    isMe: doc.membershipId?.toString() === ctx.membershipId,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

interface DuplicateKeyError {
  code: number;
  keyPattern?: Record<string, unknown>;
}

function duplicateKey(err: unknown): DuplicateKeyError | null {
  const e = err as Partial<DuplicateKeyError> | null;
  return typeof e === "object" && e !== null && e.code === 11000 ? (e as DuplicateKeyError) : null;
}

function conflictFrom(err: unknown): AppError | null {
  const dup = duplicateKey(err);
  if (!dup) return null;
  if (dup.keyPattern && "membershipId" in dup.keyPattern) {
    return AppError.conflict("Ya estás registrado como empleado de este negocio");
  }
  return AppError.conflict(
    "Ya hay un empleado con ese nombre. Agrega una inicial para diferenciarlo",
  );
}

const scope = (ctx: TenantContext) => ({ businessId: new Types.ObjectId(ctx.businessId) });
const notFound = () => AppError.notFound("Empleado no encontrado");

export async function listEmployees(ctx: TenantContext): Promise<Employee[]> {
  const docs = await EmployeeModel.find(scope(ctx))
    .collation({ locale: "es", strength: 1 })
    .sort({ active: -1, displayName: 1 })
    .lean();
  return docs.map((d) => toEmployee(d, ctx));
}

export async function getEmployee(ctx: TenantContext, employeeId: string): Promise<Employee> {
  if (!isObjectIdString(employeeId)) throw notFound();
  const doc = await EmployeeModel.findOne({
    ...scope(ctx),
    _id: new Types.ObjectId(employeeId),
  }).lean();
  if (!doc) throw notFound();
  return toEmployee(doc, ctx);
}

export async function getMyEmployee(ctx: TenantContext): Promise<Employee> {
  const doc = await EmployeeModel.findOne({
    ...scope(ctx),
    membershipId: new Types.ObjectId(ctx.membershipId),
  }).lean();
  if (!doc) throw AppError.notFound("No estás registrado como empleado de este negocio");
  return toEmployee(doc, ctx);
}

export async function createEmployee(
  ctx: TenantContext,
  input: CreateEmployeeInput,
): Promise<Employee> {
  try {
    const doc = await EmployeeModel.create({
      ...scope(ctx),
      displayName: input.displayName,
      nameKey: employeeNameKey(input.displayName),
      phone: input.phone ?? null,
      membershipId: input.linkSelf ? new Types.ObjectId(ctx.membershipId) : null,
      earningRule: toRuleDoc(input.earningRule ?? { type: "none" }),
      acceptsOnlineBookings: input.acceptsOnlineBookings,
    });
    return toEmployee(doc.toObject(), ctx);
  } catch (err) {
    throw conflictFrom(err) ?? err;
  }
}

export async function updateEmployee(
  ctx: TenantContext,
  employeeId: string,
  input: UpdateEmployeeInput,
): Promise<Employee> {
  if (!isObjectIdString(employeeId)) throw notFound();

  const set: Partial<EmployeeDoc> = {};
  if (input.displayName !== undefined) {
    set.displayName = input.displayName;
    set.nameKey = employeeNameKey(input.displayName);
  }
  if (input.phone !== undefined) set.phone = input.phone;
  if (input.earningRule !== undefined) set.earningRule = toRuleDoc(input.earningRule);
  if (input.acceptsOnlineBookings !== undefined) {
    set.acceptsOnlineBookings = input.acceptsOnlineBookings;
  }
  if (input.active !== undefined) set.active = input.active;

  try {
    const doc = await EmployeeModel.findOneAndUpdate(
      { ...scope(ctx), _id: new Types.ObjectId(employeeId) },
      { $set: set },
      { returnDocument: "after", runValidators: true },
    ).lean();
    if (!doc) throw notFound();
    return toEmployee(doc, ctx);
  } catch (err) {
    throw conflictFrom(err) ?? err;
  }
}
