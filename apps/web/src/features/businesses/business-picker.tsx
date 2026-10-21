"use client";

import { ChevronRight, Plus } from "lucide-react";
import Link from "next/link";
import { PageError, PageLoading } from "@/components/feedback/page-state";
import { StatusPill } from "@/components/ui/status-pill";
import { errorMessage } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { useMyBusinesses } from "./hooks";
import { ROLE_LABEL, businessBadge, businessInitials } from "./labels";

const AVATAR_TINTS = ["bg-brand", "bg-person-b", "bg-person-c", "bg-person-a"];

export function BusinessPicker() {
  const businesses = useMyBusinesses();

  const title = (
    <h1 className="text-[26px] leading-8 font-bold tracking-[-0.02em] sm:text-[30px] sm:leading-9">
      ¿A qué barbería entras?
    </h1>
  );

  if (businesses.isPending) {
    return (
      <>
        {title}
        <PageLoading label="Cargando tus negocios…" />
      </>
    );
  }
  if (businesses.isError) {
    return (
      <>
        {title}
        <PageError
          message={errorMessage(businesses.error)}
          onRetry={() => void businesses.refetch()}
        />
      </>
    );
  }

  const list = businesses.data;
  return (
    <>
      <div className="flex flex-col gap-1.5">
        {title}
        <p className="text-[15px] text-ink-muted">
          {list.length === 1
            ? "Tienes acceso a 1 negocio."
            : `Tienes acceso a ${list.length} negocios.`}
        </p>
      </div>
      <nav aria-label="Tus negocios">
        <ul className="flex flex-col gap-3">
          {list.map((b, index) => {
            const badge = businessBadge(b);
            const blocked = b.access !== "ok";
            return (
              <li key={b.id}>
                <Link
                  href={`/${b.slug}`}
                  className="group flex min-h-20 items-center gap-4 rounded-lg border border-line bg-surface px-4 py-3.5 transition-colors duration-150 hover:border-control sm:px-5"
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "flex size-12 shrink-0 items-center justify-center rounded-[14px] text-[17px] font-bold",
                      blocked
                        ? "bg-sunken text-ink-muted"
                        : AVATAR_TINTS[index % AVATAR_TINTS.length],
                    )}
                  >
                    {businessInitials(b.name)}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col items-start gap-1 sm:flex-row sm:items-center sm:gap-3">
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate text-base font-semibold sm:text-[17px]">
                        {b.name}
                      </span>
                      <span className="text-sm text-ink-muted">{ROLE_LABEL[b.role]}</span>
                    </span>
                    <StatusPill tone={badge.tone} className="sm:ml-auto">
                      {badge.label}
                    </StatusPill>
                  </span>
                  <ChevronRight className="size-[18px] shrink-0" aria-hidden="true" />
                </Link>
              </li>
            );
          })}
          <li>
            <Link
              href="/negocios/nuevo"
              className="flex min-h-16 items-center justify-center gap-2 rounded-lg border-[1.5px] border-dashed border-line-strong text-[15px] font-semibold transition-colors duration-150 hover:bg-surface"
            >
              <Plus className="size-[18px]" aria-hidden="true" />
              Crear otro negocio
            </Link>
          </li>
        </ul>
      </nav>
    </>
  );
}
