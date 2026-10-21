"use client";

import { ChevronsUpDown, LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/brand/logo";
import { useLogout, useMe } from "@/features/auth/hooks";
import { ROLE_LABEL, businessBadge, personInitials } from "@/features/businesses/labels";
import { cn } from "@/lib/utils";
import { hrefFor, navFor } from "./nav";
import { useCurrentBusiness } from "./panel-context";

export function Sidebar() {
  const business = useCurrentBusiness();
  const pathname = usePathname();
  const me = useMe();
  const logout = useLogout();
  const badge = businessBadge(business);
  const subtitle = badge.tone === "pending" ? badge.label : ROLE_LABEL[business.role];

  return (
    <aside className="hidden w-60 shrink-0 flex-col gap-5 bg-brand px-3 py-5 lg:sticky lg:top-0 lg:flex lg:h-dvh">
      <Link href="/inicio" aria-label="BarberOS, inicio" className="self-start rounded-md px-2">
        <Logo />
      </Link>

      <Link
        href="/negocios"
        className="flex min-h-[52px] items-center justify-between gap-2 rounded-[14px] bg-brand-hover px-3 py-2 transition-colors duration-150 hover:bg-[#eebd0f]"
      >
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-semibold">{business.name}</span>
          <span className="truncate text-xs text-ink-soft">{subtitle}</span>
        </span>
        <ChevronsUpDown className="size-4 shrink-0" aria-hidden="true" />
        <span className="sr-only">Cambiar de negocio</span>
      </Link>

      <nav aria-label="Principal" className="flex flex-col gap-1">
        {navFor(business.role).map((item) => {
          const href = hrefFor(business.slug, item.segment);
          const active = pathname === href;
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-[42px] items-center gap-3 rounded-full px-3.5 text-sm transition-colors duration-150",
                active ? "bg-ink font-semibold text-brand" : "font-medium hover:bg-brand-hover",
              )}
            >
              <Icon className="size-[18px]" aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto flex items-center gap-2.5 px-2">
        <span
          aria-hidden="true"
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-ink text-xs font-bold text-brand"
        >
          {me.data ? personInitials(me.data.name) : ""}
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm font-semibold">{me.data?.name ?? "…"}</span>
          <span className="text-xs text-ink-soft">{ROLE_LABEL[business.role]}</span>
        </span>
        <button
          type="button"
          onClick={() => logout.mutate()}
          disabled={logout.isPending}
          aria-label="Cerrar sesión"
          className="flex size-11 items-center justify-center rounded-full transition-colors duration-150 hover:bg-brand-hover"
        >
          <LogOut className="size-[18px]" aria-hidden="true" />
        </button>
      </div>
    </aside>
  );
}
