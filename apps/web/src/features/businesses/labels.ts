import type { BusinessWithRole, Role } from "@barberos/contracts";

const DAY_MS = 24 * 60 * 60 * 1000;

export const ROLE_LABEL: Record<Role, string> = {
  owner: "Dueño",
  admin: "Administrador",
  barber: "Barbero",
};

export type BadgeTone = "neutral" | "pending" | "danger";

export function businessBadge(
  b: Pick<BusinessWithRole, "status" | "access" | "trialEndsAt">,
  now = new Date(),
): { label: string; tone: BadgeTone } {
  if (b.access === "suspended") return { label: "Suspendida", tone: "danger" };
  if (b.access === "trial_expired") return { label: "Prueba terminada", tone: "pending" };
  if (b.status === "trial" && b.trialEndsAt) {
    const days = Math.ceil((new Date(b.trialEndsAt).getTime() - now.getTime()) / DAY_MS);
    if (days <= 1) return { label: "Prueba · último día", tone: "pending" };
    return { label: `Prueba · quedan ${days} días`, tone: "pending" };
  }
  return { label: "Activa", tone: "neutral" };
}

export function businessInitials(name: string): string {
  const generic = new Set([
    "barberia",
    "barbería",
    "barber",
    "barbershop",
    "peluqueria",
    "peluquería",
  ]);
  const words = name.split(/\s+/).filter(Boolean);
  const meaningful = words.filter((w) => !generic.has(w.toLowerCase()));
  const source = meaningful.length > 0 ? meaningful : words;
  return source
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

export function personInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

export function formatLongDate(iso: string, timeZone = "America/Bogota"): string {
  return new Intl.DateTimeFormat("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone,
  }).format(new Date(iso));
}
