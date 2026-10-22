import mongoose, { Schema, Types } from "mongoose";
import { tenantPlugin } from "../../shared/db/tenant-plugin.js";

export interface ServiceDoc {
  businessId: Types.ObjectId;
  name: string;
  nameKey: string;
  description: string | null;
  price: number;
  durationMinutes: number;
  visibleOnline: boolean;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const serviceSchema = new Schema<ServiceDoc>(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    nameKey: { type: String, required: true },
    description: { type: String, default: null, maxlength: 300 },
    price: {
      type: Number,
      required: true,
      min: 0,
      validate: { validator: Number.isSafeInteger, message: "El precio debe ser entero" },
    },
    durationMinutes: {
      type: Number,
      required: true,
      min: 5,
      max: 480,
      validate: { validator: (v: number) => v % 5 === 0, message: "Pasos de 5 minutos" },
    },
    visibleOnline: { type: Boolean, required: true, default: true },
    active: { type: Boolean, required: true, default: true },
  },
  { timestamps: true },
);

serviceSchema.plugin(tenantPlugin);

serviceSchema.index({ businessId: 1, nameKey: 1 }, { unique: true });

export const ServiceModel = mongoose.model<ServiceDoc>("Service", serviceSchema);
