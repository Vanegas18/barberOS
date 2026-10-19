import mongoose, { Schema, Types } from "mongoose";
import { MEMBERSHIP_STATUSES, ROLES } from "@barberos/contracts";
import type { MembershipStatus, Role } from "@barberos/contracts";
import { tenantPlugin } from "../../shared/db/tenant-plugin.js";

export interface MembershipDoc {
  businessId: Types.ObjectId; // lo añade tenantPlugin; se declara aquí para TypeScript
  userId: Types.ObjectId;
  role: Role;
  status: MembershipStatus;
  createdAt: Date;
  updatedAt: Date;
}

const membershipSchema = new Schema<MembershipDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    role: { type: String, enum: ROLES, required: true },
    status: { type: String, enum: MEMBERSHIP_STATUSES, default: "active", required: true },
  },
  { timestamps: true },
);

membershipSchema.plugin(tenantPlugin);

// Un usuario tiene como máximo una membresía por negocio.
membershipSchema.index({ businessId: 1, userId: 1 }, { unique: true });
// Para listar los negocios de un usuario.
membershipSchema.index({ userId: 1 });

export const MembershipModel = mongoose.model<MembershipDoc>("Membership", membershipSchema);
