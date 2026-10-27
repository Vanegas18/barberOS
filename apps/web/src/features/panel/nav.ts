import type { Role } from "@barberos/contracts";
import {
  Banknote,
  CalendarDays,
  ReceiptText,
  Scissors,
  SlidersHorizontal,
  Users,
  UsersRound,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  segment: string;
  label: string;
  icon: LucideIcon;
  roles: readonly Role[];
  phase?: number;
}

const MANAGERS: readonly Role[] = ["owner", "admin"];
const BARBER: readonly Role[] = ["barber"];

export const NAV_ITEMS: readonly NavItem[] = [
  { segment: "", label: "Agenda", icon: CalendarDays, roles: MANAGERS },
  { segment: "clientes", label: "Clientes", icon: Users, roles: MANAGERS, phase: 3 },
  { segment: "ventas", label: "Ventas", icon: ReceiptText, roles: MANAGERS, phase: 5 },
  { segment: "caja", label: "Caja", icon: Wallet, roles: MANAGERS, phase: 6 },
  { segment: "equipo", label: "Equipo", icon: UsersRound, roles: MANAGERS },
  { segment: "ajustes", label: "Ajustes", icon: SlidersHorizontal, roles: MANAGERS },
  { segment: "", label: "Mi agenda", icon: CalendarDays, roles: BARBER },
  { segment: "servicios", label: "Mis servicios", icon: Scissors, roles: BARBER, phase: 5 },
  { segment: "ganancias", label: "Ganancias", icon: Banknote, roles: BARBER, phase: 5 },
];

export function navFor(role: Role): NavItem[] {
  return NAV_ITEMS.filter((item) => item.roles.includes(role));
}

export function mobileNavFor(role: Role): { main: NavItem[]; more: NavItem[] } {
  const items = navFor(role);
  if (items.length <= 5) return { main: items, more: [] };
  return { main: items.slice(0, 4), more: items.slice(4) };
}

export function hrefFor(slug: string, segment: string): string {
  return segment ? `/${slug}/${segment}` : `/${slug}`;
}

export function isActivePath(pathname: string, href: string, segment: string): boolean {
  return pathname === href || (segment !== "" && pathname.startsWith(`${href}/`));
}
