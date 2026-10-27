import { Types } from "mongoose";
import type { ScheduleException, ScheduleExceptionInput } from "@barberos/contracts";
import type { TenantContext } from "../../shared/middleware/require-permission.js";
import { toWorkday } from "../employees/employee.service.js";
import { ScheduleExceptionModel, type ScheduleExceptionDoc } from "./schedule-exception.model.js";

function toException(doc: ScheduleExceptionDoc): ScheduleException {
  return {
    date: doc.date,
    workday: toWorkday(doc.workday ?? null),
    note: doc.note ?? null,
  };
}

const scope = (ctx: TenantContext, employeeId: string) => ({
  businessId: new Types.ObjectId(ctx.businessId),
  employeeId: new Types.ObjectId(employeeId),
});

export async function listExceptions(
  ctx: TenantContext,
  employeeId: string,
  range: { from: string; to: string },
): Promise<ScheduleException[]> {
  const docs = await ScheduleExceptionModel.find({
    ...scope(ctx, employeeId),
    date: { $gte: range.from, $lte: range.to },
  })
    .sort({ date: 1 })
    .lean();
  return docs.map(toException);
}

export async function upsertException(
  ctx: TenantContext,
  employeeId: string,
  date: string,
  input: ScheduleExceptionInput,
): Promise<ScheduleException> {
  const doc = await ScheduleExceptionModel.findOneAndUpdate(
    { ...scope(ctx, employeeId), date },
    { $set: { workday: input.workday, note: input.note || null } },
    { upsert: true, returnDocument: "after", runValidators: true, setDefaultsOnInsert: true },
  ).lean();
  return toException(doc);
}

export async function deleteException(
  ctx: TenantContext,
  employeeId: string,
  date: string,
): Promise<boolean> {
  const result = await ScheduleExceptionModel.deleteOne({ ...scope(ctx, employeeId), date });
  return result.deletedCount > 0;
}

export async function findException(
  ctx: TenantContext,
  employeeId: string,
  date: string,
): Promise<ScheduleException | null> {
  const doc = await ScheduleExceptionModel.findOne({ ...scope(ctx, employeeId), date }).lean();
  return doc ? toException(doc) : null;
}
