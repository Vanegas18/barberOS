import { createHash, randomBytes } from "node:crypto";
import { Types } from "mongoose";
import { INVITATION_TTL_DAYS } from "@barberos/contracts";
import type {
  AcceptedInvitation,
  CreateInvitationInput,
  CreatedInvitation,
  Invitation,
  InvitationPreview,
} from "@barberos/contracts";
import { env } from "../../config/env.js";
import { withTransaction } from "../../shared/db/transaction.js";
import { AppError } from "../../shared/errors/app-error.js";
import type { TenantContext } from "../../shared/middleware/require-permission.js";
import { findBusinessBasics } from "../businesses/business.service.js";
import {
  employeeNames,
  findInvitableEmployee,
  linkEmployeeToMembership,
} from "../employees/employee.service.js";
import { createMembership, isObjectIdString } from "../memberships/membership.service.js";
import { InvitationModel, type InvitationDoc } from "./invitation.model.js";

const DAY_MS = 24 * 60 * 60 * 1000;

function newToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashInvitationToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

const invalid = () =>
  new AppError(404, "INVITATION_INVALID", "Esta invitación no existe, ya se usó o venció");

function isDuplicateKeyError(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: number }).code === 11000;
}

function toInvitation(doc: InvitationDoc & { _id: Types.ObjectId }, names: Map<string, string>) {
  const employeeId = doc.employeeId?.toString() ?? null;
  return {
    id: doc._id.toString(),
    role: doc.role,
    employeeId,
    employeeName: employeeId ? (names.get(employeeId) ?? null) : null,
    status: doc.status,
    expiresAt: doc.expiresAt.toISOString(),
    createdAt: doc.createdAt.toISOString(),
  } satisfies Invitation;
}

const scope = (ctx: TenantContext) => ({ businessId: new Types.ObjectId(ctx.businessId) });

export async function createInvitation(
  ctx: TenantContext,
  input: CreateInvitationInput,
): Promise<CreatedInvitation> {
  const employee = input.employeeId ? await findInvitableEmployee(ctx, input.employeeId) : null;

  const token = newToken();
  const doc = await InvitationModel.create({
    ...scope(ctx),
    role: input.role,
    employeeId: employee ? new Types.ObjectId(employee.id) : null,
    tokenHash: hashInvitationToken(token),
    expiresAt: new Date(Date.now() + INVITATION_TTL_DAYS * DAY_MS),
    createdByMembershipId: new Types.ObjectId(ctx.membershipId),
  });

  const names = new Map(employee ? [[employee.id, employee.displayName]] : []);
  return {
    invitation: toInvitation(doc.toObject(), names),
    token,
    inviteUrl: `${env.WEB_ORIGIN}/invitacion/${token}`,
  };
}

export async function listPendingInvitations(ctx: TenantContext): Promise<Invitation[]> {
  const docs = await InvitationModel.find({
    ...scope(ctx),
    status: "pending",
    expiresAt: { $gt: new Date() },
  })
    .sort({ createdAt: -1 })
    .lean();
  const ids = docs.flatMap((d) => (d.employeeId ? [d.employeeId.toString()] : []));
  const names = await employeeNames(ctx.businessId, ids);
  return docs.map((d) => toInvitation(d, names));
}

export async function findPendingInvitationRole(
  ctx: TenantContext,
  invitationId: string,
): Promise<Invitation["role"]> {
  if (!isObjectIdString(invitationId)) throw AppError.notFound("Invitación no encontrada");
  const doc = await InvitationModel.findOne({
    ...scope(ctx),
    _id: new Types.ObjectId(invitationId),
    status: "pending",
  })
    .select({ role: 1 })
    .lean();
  if (!doc) throw AppError.notFound("Invitación no encontrada");
  return doc.role;
}

export async function revokeInvitation(ctx: TenantContext, invitationId: string): Promise<void> {
  const result = await InvitationModel.updateOne(
    { ...scope(ctx), _id: new Types.ObjectId(invitationId), status: "pending" },
    { $set: { status: "revoked" } },
  );
  if (result.modifiedCount === 0) throw AppError.notFound("Invitación no encontrada");
}

async function findUsable(token: string) {
  return InvitationModel.findOne({
    tokenHash: hashInvitationToken(token),
    status: "pending",
    expiresAt: { $gt: new Date() },
  })
    .setOptions({ skipTenantCheck: true })
    .lean();
}

export async function previewInvitation(token: string): Promise<InvitationPreview> {
  const doc = await findUsable(token);
  if (!doc) throw invalid();
  const business = await findBusinessBasics(doc.businessId.toString());
  if (!business) throw invalid();

  const employeeId = doc.employeeId?.toString() ?? null;
  const names = employeeId ? await employeeNames(business.id, [employeeId]) : new Map();
  return {
    businessName: business.name,
    role: doc.role,
    employeeName: employeeId ? (names.get(employeeId) ?? null) : null,
    expiresAt: doc.expiresAt.toISOString(),
  };
}

export async function acceptInvitation(token: string, userId: string): Promise<AcceptedInvitation> {
  try {
    return await withTransaction(async (session) => {
      const doc = await InvitationModel.findOneAndUpdate(
        {
          tokenHash: hashInvitationToken(token),
          status: "pending",
          expiresAt: { $gt: new Date() },
        },
        {
          $set: {
            status: "accepted",
            acceptedAt: new Date(),
            acceptedByUserId: new Types.ObjectId(userId),
          },
        },
        { session, returnDocument: "after", skipTenantCheck: true },
      ).lean();
      if (!doc) throw invalid();

      const businessId = doc.businessId.toString();
      const membershipId = await createMembership(businessId, userId, doc.role, session);
      if (doc.employeeId) {
        await linkEmployeeToMembership(
          businessId,
          doc.employeeId.toString(),
          membershipId,
          session,
        );
      }

      const business = await findBusinessBasics(businessId);
      if (!business) throw invalid();
      return { businessId, slug: business.slug, role: doc.role };
    });
  } catch (err) {
    if (isDuplicateKeyError(err)) {
      throw AppError.conflict("Ya perteneces a esta barbería");
    }
    throw err;
  }
}
