import mongoose, { Schema, Types } from "mongoose";
import { tenantPlugin } from "../../shared/db/tenant-plugin.js";

export interface AppointmentSlotDoc {
  businessId: Types.ObjectId;
  employeeId: Types.ObjectId;
  date: string;
  minute: number;
  appointmentId: Types.ObjectId;
}

const appointmentSlotSchema = new Schema<AppointmentSlotDoc>({
  employeeId: { type: Schema.Types.ObjectId, required: true },
  date: { type: String, required: true },
  minute: { type: Number, required: true, min: 0, max: 1435 },
  appointmentId: { type: Schema.Types.ObjectId, required: true },
});

appointmentSlotSchema.plugin(tenantPlugin);

appointmentSlotSchema.index({ businessId: 1, employeeId: 1, date: 1, minute: 1 }, { unique: true });
appointmentSlotSchema.index({ businessId: 1, appointmentId: 1 });

export const AppointmentSlotModel = mongoose.model<AppointmentSlotDoc>(
  "AppointmentSlot",
  appointmentSlotSchema,
);
