import mongoose, { Schema } from "mongoose";
import { BUSINESS_STATUSES, SUPPORTED_CURRENCIES } from "@barberos/contracts";
import type { BusinessStatus, Currency } from "@barberos/contracts";

export interface BusinessDoc {
  name: string;
  slug: string;
  currency: Currency;
  timezone: string;
  status: BusinessStatus;
  trialEndsAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// NOTA: Business NO usa tenantPlugin: es el tenant mismo, no tiene businessId.
const businessSchema = new Schema<BusinessDoc>(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    slug: { type: String, required: true, trim: true, lowercase: true, maxlength: 40 },
    currency: { type: String, enum: SUPPORTED_CURRENCIES, required: true },
    timezone: { type: String, required: true },
    status: { type: String, enum: BUSINESS_STATUSES, required: true, default: "active" },
    trialEndsAt: { type: Date, default: null },
  },
  { timestamps: true },
);

businessSchema.index({ slug: 1 }, { unique: true });

export const BusinessModel = mongoose.model<BusinessDoc>("Business", businessSchema);
