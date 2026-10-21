"use client";

import { ArrowLeftRight, ChevronRight, LogOut } from "lucide-react";
import Link from "next/link";
import { useLogout, useMe } from "@/features/auth/hooks";
import { ROLE_LABEL, personInitials } from "@/features/businesses/labels";
import { hrefFor, mobileNavFor } from "./nav";
import { useCurrentBusiness } from "./panel-context";

const ROW =
  "flex min-h-14 w-full items-center gap-3 px-4 text-left text-[15px] font-medium transition-colors duration-150 hover:bg-sunken";

export function MoreMenu() {
  const business = useCurrentBusiness();
  const me = useMe();
  const logout = useLogout();
  const { more } = mobileNavFor(business.role);

  return (
    <div className="mx-auto flex w-full max-w-[560px] flex-col gap-5">
      <h1 className="text-[28px] leading-9 font-bold tracking-[-0.01em]">Más</h1>

      <div className="flex items-center gap-3 rounded-lg border border-line bg-surface p-4">
        <span
          aria-hidden="true"
          className="flex size-11 shrink-0 items-center justify-center rounded-full bg-ink text-sm font-bold text-brand"
        >
          {me.data ? personInitials(me.data.name) : ""}
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-[15px] font-semibold">{me.data?.name ?? "…"}</span>
          <span className="truncate text-[13px] text-ink-muted">
            {ROLE_LABEL[business.role]} · {business.name}
          </span>
        </span>
      </div>

      {more.length > 0 && (
        <nav
          aria-label="Más secciones"
          className="overflow-hidden rounded-lg border border-line bg-surface"
        >
          <ul className="divide-y divide-line-soft">
            {more.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.label}>
                  <Link href={hrefFor(business.slug, item.segment)} className={ROW}>
                    <Icon className="size-5" aria-hidden="true" />
                    <span className="flex-1">{item.label}</span>
                    <ChevronRight className="size-4 text-ink-muted" aria-hidden="true" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}

      <div className="overflow-hidden rounded-lg border border-line bg-surface">
        <ul className="divide-y divide-line-soft">
          <li>
            <Link href="/negocios" className={ROW}>
              <ArrowLeftRight className="size-5" aria-hidden="true" />
              <span className="flex-1">Cambiar de negocio</span>
              <ChevronRight className="size-4 text-ink-muted" aria-hidden="true" />
            </Link>
          </li>
          <li>
            <button
              type="button"
              onClick={() => logout.mutate()}
              disabled={logout.isPending}
              className={`${ROW} text-danger`}
            >
              <LogOut className="size-5" aria-hidden="true" />
              Cerrar sesión
            </button>
          </li>
        </ul>
      </div>
    </div>
  );
}
