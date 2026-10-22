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

  const memberships = await MembershipModel.find({
    userId: new Types.ObjectId(userId),
    status: "active",
  })
    .select({ businessId: 1, role: 1 })
    .setOptions({ skipTenantCheck: true })
    .lean();

  return memberships.map((m) => ({ businessId: m.businessId.toString(), role: m.role }));
}

export async function createMembership(
  businessId: string,
  userId: string,
  role: Exclude<Role, "owner">,
  session: ClientSession,
): Promise<string> {
  const [membership] = await MembershipModel.create(
    [
      {
        businessId: new Types.ObjectId(businessId),
        userId: new Types.ObjectId(userId),
        role,
      },
    ],
    { session },
  );
  if (!membership) throw new Error("No se pudo crear la membresía");
  return membership._id.toString();
}
