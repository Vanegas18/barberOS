"use client";

import { ChevronRight, Scissors, Store } from "lucide-react";
import Link from "next/link";
import { StatusPill } from "@/components/ui/status-pill";
import { useCurrentBusiness } from "@/features/panel/panel-context";

export function SettingsHub() {
  const business = useCurrentBusiness();

  return (
    <div className="mx-auto flex w-full max-w-[880px] flex-col gap-6">
      <h1 className="text-[28px] leading-9 font-bold tracking-[-0.01em]">Ajustes</h1>
      <ul className="overflow-hidden rounded-lg border border-line bg-surface">
        <li className="border-b border-line-soft">
          <Link
            href={`/${business.slug}/ajustes/servicios`}
            className="flex min-h-[68px] items-center gap-4 px-4 py-3 transition-colors duration-150 hover:bg-ground sm:px-5"
          >
            <span
              aria-hidden="true"
              className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand-ink"
            >
              <Scissors className="size-5" />
            </span>
            <span className="flex flex-1 flex-col">
              <span className="text-[15px] font-semibold">Servicios y precios</span>
              <span className="text-[13px] text-ink-muted">
                Lo que ofreces, su precio y su duración
              </span>
            </span>
            <ChevronRight className="size-4 text-ink-muted" aria-hidden="true" />
          </Link>
        </li>
        <li>
          <div className="flex min-h-[68px] items-center gap-4 px-4 py-3 sm:px-5">
            <span
              aria-hidden="true"
              className="flex size-10 shrink-0 items-center justify-center rounded-full bg-sunken text-ink-muted"
            >
              <Store className="size-5" />
            </span>
            <span className="flex flex-1 flex-col">
              <span className="text-[15px] font-semibold text-ink-muted">Datos del negocio</span>
              <span className="text-[13px] text-ink-muted">Nombre y zona horaria</span>
            </span>
            <StatusPill tone="done">Muy pronto</StatusPill>
          </div>
        </li>
      </ul>
    </div>
  );
}
