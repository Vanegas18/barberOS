import { Types, type ClientSession } from "mongoose";
import { DEFAULT_WEEKLY_SCHEDULE, WEEKDAYS } from "@barberos/contracts";
import type {
  CreateEmployeeInput,
  EarningRule,
  Employee,
  UpdateEmployeeInput,
  WeeklySchedule,
  Workday,
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

/** Copia limpia (sin _id ni metadatos de Mongoose); un empleado antiguo sin horario usa el de base. */
export function toWeeklySchedule(doc: WeeklySchedule | null | undefined): WeeklySchedule {
  const source = doc ?? DEFAULT_WEEKLY_SCHEDULE;
  return Object.fromEntries(
    WEEKDAYS.map((day) => [day, toWorkday(source[day] ?? null)]),
  ) as WeeklySchedule;
}

export function toWorkday(day: Workday | null): Workday | null {
  if (!day) return null;
  return {
    start: day.start,
    end: day.end,
    lunch: day.lunch
      ? { start: day.lunch.start, durationMinutes: day.lunch.durationMinutes }
      : null,
  };
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
    weeklySchedule: toWeeklySchedule(doc.weeklySchedule),
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
      weeklySchedule: input.weeklySchedule ?? DEFAULT_WEEKLY_SCHEDULE,
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

export async function setWeeklySchedule(
  ctx: TenantContext,
  employeeId: string,
  weeklySchedule: WeeklySchedule,
): Promise<Employee> {
  if (!isObjectIdString(employeeId)) throw notFound();
  const doc = await EmployeeModel.findOneAndUpdate(
    { ...scope(ctx), _id: new Types.ObjectId(employeeId) },
    { $set: { weeklySchedule } },
    { returnDocument: "after", runValidators: true },
  ).lean();
  if (!doc) throw notFound();
  return toEmployee(doc, ctx);
}

export async function findEmployeeRef(
  ctx: TenantContext,
  employeeId: string,
): Promise<{ id: string; isMe: boolean; weeklySchedule: WeeklySchedule } | null> {
  if (!isObjectIdString(employeeId)) return null;
  const doc = await EmployeeModel.findOne({ ...scope(ctx), _id: new Types.ObjectId(employeeId) })
    .select({ membershipId: 1, weeklySchedule: 1 })
    .lean();
  if (!doc) return null;
  return {
    id: doc._id.toString(),
    isMe: doc.membershipId?.toString() === ctx.membershipId,
    weeklySchedule: toWeeklySchedule(doc.weeklySchedule),
  };
}

export async function findInvitableEmployee(
  ctx: TenantContext,
  employeeId: string,
): Promise<{ id: string; displayName: string }> {
  if (!isObjectIdString(employeeId)) throw notFound();
  const doc = await EmployeeModel.findOne({ ...scope(ctx), _id: new Types.ObjectId(employeeId) })
    .select({ displayName: 1, membershipId: 1, active: 1 })
    .lean();
  if (!doc) throw notFound();
  if (!doc.active) throw AppError.conflict("Ese empleado está desactivado");
  if (doc.membershipId) throw AppError.conflict("Ese empleado ya tiene una cuenta vinculada");
  return { id: doc._id.toString(), displayName: doc.displayName };
}

export async function employeeNames(
  businessId: string,
  ids: string[],
): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();
  const docs = await EmployeeModel.find({
    businessId: new Types.ObjectId(businessId),
    _id: { $in: ids.map((id) => new Types.ObjectId(id)) },
  })
    .select({ displayName: 1 })
    .lean();
  return new Map(docs.map((d) => [d._id.toString(), d.displayName]));
}

export async function linkEmployeeToMembership(
  businessId: string,
  employeeId: string,
  membershipId: string,
  session: ClientSession,
): Promise<void> {
  const result = await EmployeeModel.updateOne(
    {
      businessId: new Types.ObjectId(businessId),
      _id: new Types.ObjectId(employeeId),
      membershipId: null,
      active: true,
    },
    { $set: { membershipId: new Types.ObjectId(membershipId) } },
    { session },
  );
  if (result.modifiedCount === 0) {
    throw AppError.conflict("Ese empleado ya no está disponible para vincular");
  }
}
