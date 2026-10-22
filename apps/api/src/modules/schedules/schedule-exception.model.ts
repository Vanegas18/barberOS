import mongoose, { Schema, Types } from "mongoose";
import type { Workday } from "@barberos/contracts";
import { tenantPlugin } from "../../shared/db/tenant-plugin.js";

export interface ScheduleExceptionDoc {
  businessId: Types.ObjectId;
  employeeId: Types.ObjectId;
  date: string;
  workday: Workday | null;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const lunchSchema = new Schema(
  {
    start: { type: String, required: true },
    durationMinutes: { type: Number, required: true },
  },
  { _id: false },
);

const workdaySchema = new Schema(
  {
    start: { type: String, required: true },
    end: { type: String, required: true },
    lunch: { type: lunchSchema, default: null },
  },
  { _id: false },
);

const scheduleExceptionSchema = new Schema<ScheduleExceptionDoc>(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: "Employee", required: true },
    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    workday: { type: workdaySchema, default: null },
    note: { type: String, default: null, maxlength: 120 },
  },
  { timestamps: true },
);

scheduleExceptionSchema.plugin(tenantPlugin);

scheduleExceptionSchema.index({ businessId: 1, employeeId: 1, date: 1 }, { unique: true });

export const ScheduleExceptionModel = mongoose.model<ScheduleExceptionDoc>(
  "ScheduleException",
  scheduleExceptionSchema,
);
