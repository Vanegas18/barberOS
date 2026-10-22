import mongoose, { Schema, Types } from "mongoose";
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

const employeeSchema = new Schema<EmployeeDoc>(
  {
    displayName: { type: String, required: true, trim: true, maxlength: 40 },
    nameKey: { type: String, required: true },
    phone: { type: String, default: null },
    membershipId: { type: Schema.Types.ObjectId, ref: "Membership", default: null },
    earningRule: { type: earningRuleSchema, required: true, default: () => ({ type: "none" }) },
    acceptsOnlineBookings: { type: Boolean, required: true, default: true },
    active: { type: Boolean, required: true, default: true },
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
