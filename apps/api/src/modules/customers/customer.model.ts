import mongoose, { Schema, Types } from "mongoose";
import { tenantPlugin } from "../../shared/db/tenant-plugin.js";

export interface CustomerDoc {
  businessId: Types.ObjectId;
  name: string;
  nameKey: string;
  phone: string;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const customerSchema = new Schema<CustomerDoc>(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    nameKey: { type: String, required: true },
    phone: { type: String, required: true, match: /^\+[1-9]\d{7,14}$/ },
    note: { type: String, default: null, maxlength: 300 },
  },
  { timestamps: true },
);

customerSchema.plugin(tenantPlugin);

customerSchema.index({ businessId: 1, phone: 1 }, { unique: true });
customerSchema.index({ businessId: 1, nameKey: 1 });

export const CustomerModel = mongoose.model<CustomerDoc>("Customer", customerSchema);
