"use client";

import { ChevronDown, Ellipsis } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandMark } from "@/components/brand/logo";
import { useMe } from "@/features/auth/hooks";
import { personInitials } from "@/features/businesses/labels";
import { cn } from "@/lib/utils";
import { hrefFor, mobileNavFor } from "./nav";
import { useCurrentBusiness } from "./panel-context";

export function MobileHeader() {
  const business = useCurrentBusiness();
  const me = useMe();
  return (
    <header className="flex items-center justify-between gap-2 rounded-b-[24px] bg-brand px-4 py-2.5 lg:hidden">
      <Link href="/negocios" className="flex min-h-11 min-w-0 items-center gap-2 rounded-md">
        <BrandMark className="size-[30px] rounded-[10px]" />
        <span className="truncate text-[15px] font-semibold">{business.name}</span>
        <ChevronDown className="size-3.5 shrink-0" aria-hidden="true" />
        <span className="sr-only">, cambiar de negocio</span>
      </Link>
      <Link
        href={`/${business.slug}/mas`}
        aria-label="Tu cuenta"
        className="flex size-11 shrink-0 items-center justify-center rounded-full bg-ink text-[13px] font-bold text-brand"
      >
        {me.data ? personInitials(me.data.name) : ""}
      </Link>
    </header>
  );
}

export function BottomNav() {
  const business = useCurrentBusiness();
  const pathname = usePathname();
  const { main, more } = mobileNavFor(business.role);
  const moreHref = `/${business.slug}/mas`;

  const items = [
    ...main.map((item) => ({
      key: item.label,
      label: item.label,
      icon: item.icon,
      href: hrefFor(business.slug, item.segment),
    })),
    ...(more.length > 0 ? [{ key: "mas", label: "Más", icon: Ellipsis, href: moreHref }] : []),
  ];
  const moreActive =
    pathname === moreHref || more.some((i) => pathname === hrefFor(business.slug, i.segment));

  return (
    <nav
      aria-label="Principal"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <ul
        className="grid h-[72px] px-1.5 pt-1.5 pb-2.5"
        style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
      >
        {items.map((item) => {
          const active = item.key === "mas" ? moreActive : pathname === item.href;
          const Icon = item.icon;
          return (
            <li key={item.key} className="flex">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-1 flex-col items-center justify-center gap-[3px] text-[11px]",
                  active ? "font-semibold text-ink" : "font-medium text-ink-muted",
                )}
              >
                <span
                  className={cn(
                    "flex h-[30px] w-[52px] items-center justify-center rounded-full transition-colors duration-150",
                    active && "bg-brand",
                  )}
                >
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
