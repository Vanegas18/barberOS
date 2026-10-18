import type { Role } from "./roles.js";

export const PERMISSIONS = [
  "business:read",
  "business:update",
  "members:read",
  "members:manage",
  "services:read",
  "services:manage",
  "employees:read",
  "employees:manage",
  "customers:read",
  "customers:manage",
  "appointments:read",
  "appointments:read_own",
  "appointments:manage",
  "sales:read",
  "sales:create",
  "sales:void",
  "commissions:read",
  "commissions:read_own",
  "commissions:settle",
  "expenses:read",
  "expenses:manage",
  "cash:read",
  "cash:operate",
  "cash:close",
  "dashboard:read",
  "audit:read",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const ALL: readonly Permission[] = PERMISSIONS;

export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  owner: ALL,
  admin: [
    "business:read",
    "members:read",
    "services:read",
    "services:manage",
    "employees:read",
    "employees:manage",
    "customers:read",
    "customers:manage",
    "appointments:read",
    "appointments:manage",
    "sales:read",
    "sales:create",
    "commissions:read",
    "expenses:read",
    "expenses:manage",
    "cash:read",
    "cash:operate",
  ],
  barber: [
    "business:read",
    "services:read",
    "customers:read",
    "appointments:read_own",
    "commissions:read_own",
  ],
};

export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}
