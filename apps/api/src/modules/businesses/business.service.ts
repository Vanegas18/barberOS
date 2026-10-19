import { Types } from "mongoose";
import type { CreateBusinessInput, Role } from "@barberos/contracts";
import { withTransaction } from "../../shared/db/transaction.js";
import { AppError } from "../../shared/errors/app-error.js";
import { MembershipModel } from "../memberships/membership.model.js";
import { BusinessModel } from "./business.model.js";

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

      await MembershipModel.create(
        [{ businessId: business._id, userId: new Types.ObjectId(userId), role: "owner" }],
        { session },
      );

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
  // skipTenantCheck: caso legítimo. Aquí aún no hay negocio activo; se pregunta
  // justamente "¿a qué negocios pertenece este usuario?". Filtramos por userId.
  const memberships = await MembershipModel.find({
    userId: new Types.ObjectId(userId),
    status: "active",
  }).setOptions({ skipTenantCheck: true });

  if (memberships.length === 0) return [];

  const businesses = await BusinessModel.find({
    _id: { $in: memberships.map((m) => m.businessId) },
  });
  const byId = new Map(businesses.map((b) => [b._id.toString(), b]));

  const result: BusinessWithRole[] = [];
  for (const m of memberships) {
    const business = byId.get(m.businessId.toString());
    if (business) result.push({ ...toSummary(business), role: m.role });
  }
  return result.sort((a, b) => a.name.localeCompare(b.name));
}
