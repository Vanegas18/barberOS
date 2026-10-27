import type { EarningRule } from "@barberos/contracts";
import { formatMoney } from "@/lib/format";

export function bpToPercent(rateBp: number): number {
  return rateBp / 100;
}

export function percentToBp(percent: number): number {
  return Math.round(percent * 100);
}

const percentFormat = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 2 });

export function earningRuleLabel(rule: EarningRule, currency: string): string {
  if (rule.type === "percentage") {
    return `${percentFormat.format(bpToPercent(rule.rateBp))} % de cada servicio`;
  }
  if (rule.type === "fixed") return `${formatMoney(rule.amount, currency)} por servicio`;
  return "Sin comisión";
}

const AVATAR_TONES = ["bg-person-a", "bg-person-b", "bg-person-c"] as const;

export function avatarTone(index: number): string {
  return AVATAR_TONES[index % AVATAR_TONES.length]!;
}
