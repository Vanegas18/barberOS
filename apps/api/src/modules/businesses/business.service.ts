import { Types } from "mongoose";
import type { CreateBusinessInput, Role, UpdateBusinessInput } from "@barberos/contracts";
import { withTransaction } from "../../shared/db/transaction.js";
import { AppError } from "../../shared/errors/app-error.js";
import {
  createOwnerMembership,
  listActiveMembershipsForUser,
} from "../memberships/membership.service.js";
import { BusinessModel } from "./business.model.js";
import type { TenantContext } from "../../shared/middleware/require-permission.js";

export interface BusinessSummary {
  id: string;
  name: string;
  slug: string;
  currency: string;
  timezone: string;
}

export interface BusinessWithRole extends BusinessSummary {
  role: Role;
}

function toSummary(b: {
  _id: { toString(): string };
  name: string;
  slug: string;
  currency: string;
  timezone: string;
}): BusinessSummary {
  return {
    id: b._id.toString(),
    name: b.name,
    slug: b.slug,
    currency: b.currency,
    timezone: b.timezone,
  };
}

function isDuplicateKeyError(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: number }).code === 11000;
}

export async function createBusiness(
  userId: string,
  input: CreateBusinessInput,
): Promise<BusinessWithRole> {
  try {
    return await withTransaction(async (session) => {
      const [business] = await BusinessModel.create(
        [
          {
            name: input.name,
            slug: input.slug,
            currency: input.currency,
            timezone: input.timezone,
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

/** El negocio sale SIEMPRE del contexto verificado, nunca de params ni del body. */
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
