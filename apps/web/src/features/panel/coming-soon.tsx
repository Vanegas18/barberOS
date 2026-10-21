"use client";

import { notFound } from "next/navigation";
import { StatusPill } from "@/components/ui/status-pill";
import { navFor } from "./nav";
import { useCurrentBusiness } from "./panel-context";

export function ComingSoon({ segment }: { segment: string }) {
  const business = useCurrentBusiness();
  const item = navFor(business.role).find((i) => i.segment === segment && segment !== "");
  if (!item) notFound();
  const Icon = item.icon;

  return (
    <div className="mx-auto flex w-full max-w-[1040px] flex-col gap-6">
      <h1 className="text-[28px] leading-9 font-bold tracking-[-0.01em]">{item.label}</h1>
      <section className="flex flex-col items-center gap-3 rounded-lg border border-line bg-surface px-6 py-14 text-center">
        <span
          aria-hidden="true"
          className="flex size-12 items-center justify-center rounded-full bg-brand-soft text-brand-ink"
        >
          <Icon className="size-6" />
        </span>
        <p className="text-[15px] font-semibold">Estamos construyendo esta sección</p>
        {item.phase && <StatusPill tone="done">Muy pronto · Fase {item.phase}</StatusPill>}
      </section>
    </div>
  );
}
