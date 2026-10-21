import mongoose, { Schema, Types } from "mongoose";

/**
 * Código de activación emitido por la plataforma (Vanegas Solutions).
 * NO usa tenantPlugin: pertenece a la plataforma, no a un negocio.
 * Solo se guarda el hash; el código en claro se muestra una única vez al emitirlo.
 */
export interface ActivationCodeDoc {
  codeHash: string;
  label: string;
  trialDays: number; // 0 = el negocio nace activo
  expiresAt: Date;
  usedAt: Date | null;
  usedByUserId: Types.ObjectId | null;
  usedForBusinessId: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const activationCodeSchema = new Schema<ActivationCodeDoc>(
  {
    codeHash: { type: String, required: true },
    label: { type: String, required: true, trim: true, maxlength: 120 },
    trialDays: { type: Number, required: true, min: 0, max: 365, default: 0 },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date, default: null },
    usedByUserId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    usedForBusinessId: { type: Schema.Types.ObjectId, ref: "Business", default: null },
  },
  { timestamps: true },
);

activationCodeSchema.index({ codeHash: 1 }, { unique: true });

export const ActivationCodeModel = mongoose.model<ActivationCodeDoc>(
  "ActivationCode",
  activationCodeSchema,
);
