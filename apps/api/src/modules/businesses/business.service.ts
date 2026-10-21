import { Types } from "mongoose";
import type {
  BusinessAccess,
  BusinessStatus,
  BusinessSummary,
  BusinessWithRole,
  CreateBusinessInput,
  UpdateBusinessInput,
} from "@barberos/contracts";
import { withTransaction } from "../../shared/db/transaction.js";
import { AppError } from "../../shared/errors/app-error.js";
import type { TenantContext } from "../../shared/middleware/require-permission.js";
import { consumeActivationCode } from "../activation-codes/activation-code.service.js";
import {
  createOwnerMembership,
  isObjectIdString,
  listActiveMembershipsForUser,
} from "../memberships/membership.service.js";
import { BusinessModel } from "./business.model.js";

const DAY_MS = 24 * 60 * 60 * 1000;

interface AccessFields {
  status?: BusinessStatus | null;
  trialEndsAt?: Date | null;
}

export function resolveBusinessAccess(b: AccessFields, now: Date = new Date()): BusinessAccess {
  if (b.status === "suspended") return "suspended";
  if (b.status === "trial" && (!b.trialEndsAt || b.trialEndsAt.getTime() <= now.getTime())) {
    return "trial_expired";
  }
  return "ok";
}

function toSummary(
  b: AccessFields & {
    _id: { toString(): string };
    name: string;
    slug: string;
    currency: string;
    timezone: string;
  },
): BusinessSummary {
  return {
    id: b._id.toString(),
    name: b.name,
    slug: b.slug,
    currency: b.currency,
    timezone: b.timezone,
    status: b.status ?? "active",
    trialEndsAt: b.trialEndsAt ? b.trialEndsAt.toISOString() : null,
    access: resolveBusinessAccess(b),
  };
}

function isDuplicateKeyError(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: number }).code === 11000;
}

export async function createBusiness(
  userId: string,
  input: CreateBusinessInput,
): Promise<BusinessWithRole> {
  const businessId = new Types.ObjectId();

  try {
    return await withTransaction(async (session) => {
      const { trialDays } = await consumeActivationCode(
        input.activationCode,
        { userId, businessId: businessId.toString() },
        session,
      );

      const [business] = await BusinessModel.create(
        [
          {
            _id: businessId,
            name: input.name,
            slug: input.slug,
            currency: input.currency,
            timezone: input.timezone,
            status: trialDays > 0 ? "trial" : "active",
            trialEndsAt: trialDays > 0 ? new Date(Date.now() + trialDays * DAY_MS) : null,
          },
        ],
        { session },
      );
      if (!business) throw new Error("No se pudo crear el negocio");

      await createOwnerMembership(business._id.toString(), userId, session);

      return { ...toSummary(business), role: "owner" as const };
    });
  } catch (err) {
    if (isDuplicateKeyError(err)) {
      throw AppError.conflict("Ese identificador ya está en uso");
    }
    throw err;
  }
}

export async function listBusinessesForUser(userId: string): Promise<BusinessWithRole[]> {
  const memberships = await listActiveMembershipsForUser(userId);
  if (memberships.length === 0) return [];

  const businesses = await BusinessModel.find({
    _id: { $in: memberships.map((m) => new Types.ObjectId(m.businessId)) },
  });
  const byId = new Map(businesses.map((b) => [b._id.toString(), b]));

  const result: BusinessWithRole[] = [];
  for (const m of memberships) {
    const business = byId.get(m.businessId);
    if (business) result.push({ ...toSummary(business), role: m.role });
  }
  return result.sort((a, b) => a.name.localeCompare(b.name));
}

export async function getBusinessAccess(businessId: string): Promise<BusinessAccess | null> {
  if (!isObjectIdString(businessId)) return null;
  const business = await BusinessModel.findById(businessId)
    .select({ status: 1, trialEndsAt: 1 })
    .lean();
  if (!business) return null;
  return resolveBusinessAccess(business);
}

export async function getBusiness(ctx: TenantContext): Promise<BusinessWithRole> {
  const business = await BusinessModel.findById(ctx.businessId);
  if (!business) throw AppError.notFound();
  return { ...toSummary(business), role: ctx.role };
}

export async function updateBusiness(
  ctx: TenantContext,
  input: UpdateBusinessInput,
): Promise<BusinessWithRole> {
  const business = await BusinessModel.findByIdAndUpdate(
    ctx.businessId,
    { $set: input },
    { returnDocument: "after", runValidators: true },
  );
  if (!business) throw AppError.notFound();
  return { ...toSummary(business), role: ctx.role };
}
