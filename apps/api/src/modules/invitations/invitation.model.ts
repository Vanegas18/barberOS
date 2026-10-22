import mongoose, { Schema, Types } from "mongoose";
import { INVITABLE_ROLES, INVITATION_STATUSES } from "@barberos/contracts";
import type { InvitableRole, InvitationStatus } from "@barberos/contracts";
import { tenantPlugin } from "../../shared/db/tenant-plugin.js";

export interface InvitationDoc {
  businessId: Types.ObjectId;
  role: InvitableRole;
  employeeId: Types.ObjectId | null;
  tokenHash: string;
  status: InvitationStatus;
  expiresAt: Date;
  createdByMembershipId: Types.ObjectId;
  acceptedAt: Date | null;
  acceptedByUserId: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const invitationSchema = new Schema<InvitationDoc>(
  {
    role: { type: String, enum: INVITABLE_ROLES, required: true },
    employeeId: { type: Schema.Types.ObjectId, ref: "Employee", default: null },
    tokenHash: { type: String, required: true },
    status: { type: String, enum: INVITATION_STATUSES, required: true, default: "pending" },
    expiresAt: { type: Date, required: true },
    createdByMembershipId: { type: Schema.Types.ObjectId, ref: "Membership", required: true },
    acceptedAt: { type: Date, default: null },
    acceptedByUserId: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true },
);

invitationSchema.plugin(tenantPlugin);

invitationSchema.index({ tokenHash: 1 }, { unique: true });
invitationSchema.index({ businessId: 1, status: 1, expiresAt: 1 });

export const InvitationModel = mongoose.model<InvitationDoc>("Invitation", invitationSchema);
