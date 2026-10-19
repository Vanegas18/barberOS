import { Types } from "mongoose";
import type { ClientSession } from "mongoose";
import type { Role } from "@barberos/contracts";
import { MembershipModel } from "./membership.model.js";

export interface ActiveMembership {
  membershipId: string;
  role: Role;
}

export interface UserMembership {
  businessId: string;
  role: Role;
}

const OBJECT_ID_REGEX = /^[a-f\d]{24}$/i;

export function isObjectIdString(value: string): boolean {
  return OBJECT_ID_REGEX.test(value);
}

/**
 * Devuelve la membresía ACTIVA del usuario en el negocio, o null.
 * Siempre consulta la base: nunca se confía en claims del token.
 */
export async function findActiveMembership(
  businessId: string,
  userId: string,
): Promise<ActiveMembership | null> {
  if (!isObjectIdString(businessId) || !isObjectIdString(userId)) return null;

  const membership = await MembershipModel.findOne({
    businessId: new Types.ObjectId(businessId),
    userId: new Types.ObjectId(userId),
    status: "active",
  })
    .select({ role: 1 })
    .lean();

  if (!membership) return null;
  return { membershipId: membership._id.toString(), role: membership.role };
}

/** Crea la membresía owner. Debe llamarse dentro de una transacción. */
export async function createOwnerMembership(
  businessId: string,
  userId: string,
  session: ClientSession,
): Promise<void> {
  await MembershipModel.create(
    [
      {
        businessId: new Types.ObjectId(businessId),
        userId: new Types.ObjectId(userId),
        role: "owner",
      },
    ],
    { session },
  );
}

export async function listActiveMembershipsForUser(userId: string): Promise<UserMembership[]> {
  if (!isObjectIdString(userId)) return [];

  // skipTenantCheck: caso legítimo. Aún no hay negocio activo; se pregunta
  // justamente "¿a qué negocios pertenece este usuario?". Filtramos por userId.
  const memberships = await MembershipModel.find({
    userId: new Types.ObjectId(userId),
    status: "active",
  })
    .select({ businessId: 1, role: 1 })
    .setOptions({ skipTenantCheck: true })
    .lean();

  return memberships.map((m) => ({ businessId: m.businessId.toString(), role: m.role }));
}
