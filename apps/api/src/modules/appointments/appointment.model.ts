import mongoose, { Schema, Types } from "mongoose";
import {
  APPOINTMENT_SOURCES,
  APPOINTMENT_STATUSES,
  type AppointmentChangeKind,
  type AppointmentSource,
  type AppointmentStatus,
} from "@barberos/contracts";
import { tenantPlugin } from "../../shared/db/tenant-plugin.js";

export interface AppointmentCustomerDoc {
  customerId: Types.ObjectId | null;
  name: string;
  phone: string | null;
}

export interface AppointmentServiceDoc {
  serviceId: Types.ObjectId;
  name: string;
  price: number;
  durationMinutes: number;
}

export interface AppointmentChangeDoc {
  kind: AppointmentChangeKind;
  at: Date;
  byMembershipId: Types.ObjectId;
  fromStatus: AppointmentStatus | null;
  toStatus: AppointmentStatus;
}

export interface AppointmentDoc {
  businessId: Types.ObjectId;
  employeeId: Types.ObjectId;
  customer: AppointmentCustomerDoc;
  services: AppointmentServiceDoc[];
  date: string;
  startMinutes: number;
  endMinutes: number;
  status: AppointmentStatus;
  source: AppointmentSource;
  recordedAfter: boolean;
  note: string | null;
  history: AppointmentChangeDoc[];
  createdAt: Date;
  updatedAt: Date;
}

const customerSchema = new Schema<AppointmentCustomerDoc>(
  {
    customerId: { type: Schema.Types.ObjectId, default: null },
    name: { type: String, required: true, maxlength: 60 },
    phone: { type: String, default: null },
  },
  { _id: false },
);

const serviceSchema = new Schema<AppointmentServiceDoc>(
  {
    serviceId: { type: Schema.Types.ObjectId, required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    durationMinutes: { type: Number, required: true, min: 5 },
  },
  { _id: false },
);

const changeSchema = new Schema<AppointmentChangeDoc>(
  {
    kind: { type: String, required: true },
    at: { type: Date, required: true },
    byMembershipId: { type: Schema.Types.ObjectId, required: true },
    fromStatus: { type: String, enum: [...APPOINTMENT_STATUSES], default: null },
    toStatus: { type: String, enum: APPOINTMENT_STATUSES, required: true },
  },
  { _id: false },
);

const appointmentSchema = new Schema<AppointmentDoc>(
  {
    employeeId: { type: Schema.Types.ObjectId, required: true },
    customer: { type: customerSchema, required: true },
    services: {
      type: [serviceSchema],
      validate: { validator: (v: unknown[]) => v.length > 0, message: "Sin servicios" },
    },
    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    startMinutes: { type: Number, required: true, min: 0, max: 1435 },
    endMinutes: { type: Number, required: true, min: 5, max: 1440 },
    status: { type: String, enum: APPOINTMENT_STATUSES, required: true },
    source: { type: String, enum: APPOINTMENT_SOURCES, required: true },
    recordedAfter: { type: Boolean, required: true, default: false },
    note: { type: String, default: null, maxlength: 200 },
    history: { type: [changeSchema], default: [] },
  },
  { timestamps: true },
);

appointmentSchema.plugin(tenantPlugin);

appointmentSchema.index({ businessId: 1, date: 1, employeeId: 1, startMinutes: 1 });
appointmentSchema.index({ businessId: 1, "customer.customerId": 1, date: -1 });

export const AppointmentModel = mongoose.model<AppointmentDoc>("Appointment", appointmentSchema);
