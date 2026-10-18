import mongoose, { Schema, Types } from "mongoose";

export interface SessionDoc {
  userId: Types.ObjectId;
  refreshTokenHash: string;
  expiresAt: Date;
  revokedAt?: Date;
  userAgent?: string;
  createdAt: Date;
}

// NOTA: Session no usa tenantPlugin; pertenece a un usuario, no a un negocio.
const sessionSchema = new Schema<SessionDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    refreshTokenHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date },
    userAgent: { type: String, maxlength: 300 },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

sessionSchema.index({ refreshTokenHash: 1 }, { unique: true });
// TTL: MongoDB borra la sesión automáticamente cuando llega expiresAt
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const SessionModel = mongoose.model<SessionDoc>("Session", sessionSchema);
