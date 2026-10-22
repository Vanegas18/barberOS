import mongoose, { Schema, Types } from "mongoose";
import { DEFAULT_WEEKLY_SCHEDULE, WEEKDAYS } from "@barberos/contracts";
import type { WeeklySchedule } from "@barberos/contracts";
import { tenantPlugin } from "../../shared/db/tenant-plugin.js";

export const EARNING_RULE_TYPES = ["percentage", "fixed", "none"] as const;

export interface EarningRuleDoc {
  type: (typeof EARNING_RULE_TYPES)[number];
  rateBp?: number;
  amount?: number;
}

export interface EmployeeDoc {
  businessId: Types.ObjectId;
  displayName: string;
  nameKey: string;
  phone: string | null; // E.164
  membershipId: Types.ObjectId | null;
  earningRule: EarningRuleDoc;
  acceptsOnlineBookings: boolean;
  active: boolean;
  weeklySchedule: WeeklySchedule;
  createdAt: Date;
  updatedAt: Date;
}

const earningRuleSchema = new Schema<EarningRuleDoc>(
  {
    type: { type: String, enum: EARNING_RULE_TYPES, required: true },
    rateBp: { type: Number, min: 0, max: 10_000 },
    amount: { type: Number, min: 0 },
  },
  { _id: false },
);

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

const weeklyScheduleSchema = new Schema(
  Object.fromEntries(WEEKDAYS.map((day) => [day, { type: workdaySchema, default: null }])),
  { _id: false },
);

const employeeSchema = new Schema<EmployeeDoc>(
  {
    displayName: { type: String, required: true, trim: true, maxlength: 40 },
    nameKey: { type: String, required: true },
    phone: { type: String, default: null },
    membershipId: { type: Schema.Types.ObjectId, ref: "Membership", default: null },
    earningRule: { type: earningRuleSchema, required: true, default: () => ({ type: "none" }) },
    acceptsOnlineBookings: { type: Boolean, required: true, default: true },
    active: { type: Boolean, required: true, default: true },
    weeklySchedule: {
      type: weeklyScheduleSchema,
      required: true,
      default: () => structuredClone(DEFAULT_WEEKLY_SCHEDULE),
    },
  },
  { timestamps: true },
);

employeeSchema.plugin(tenantPlugin);

employeeSchema.index({ businessId: 1, nameKey: 1 }, { unique: true });
employeeSchema.index(
  { businessId: 1, membershipId: 1 },
  { unique: true, partialFilterExpression: { membershipId: { $type: "objectId" } } },
);

export const EmployeeModel = mongoose.model<EmployeeDoc>("Employee", employeeSchema);
