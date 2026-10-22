"use client";

import type { Service } from "@barberos/contracts";
import { ArrowLeft, Globe, Pencil, Plus, Scissors } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { PageError, PageLoading } from "@/components/feedback/page-state";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { StatusPill } from "@/components/ui/status-pill";
import { useCurrentBusiness } from "@/features/panel/panel-context";
import { formatDuration, formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useServices } from "./hooks";
import { ServiceForm } from "./service-form";

type Editing = { mode: "create" } | { mode: "edit"; service: Service } | null;

export function ServicesManager() {
  const business = useCurrentBusiness();
  const services = useServices(business.id);
  const [editing, setEditing] = useState<Editing>(null);
  const close = () => setEditing(null);

  return (
    <div className="mx-auto flex w-full max-w-[880px] flex-col gap-6">
      <div>
        <Button asChild variant="ghost" className="-ml-3 px-3">
          <Link href={`/${business.slug}/ajustes`}>
            <ArrowLeft aria-hidden="true" />
            Ajustes
          </Link>
        </Button>
      </div>

      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-[28px] leading-9 font-bold tracking-[-0.01em]">
            Servicios y precios
          </h1>
          <p className="text-[15px] text-ink-muted">
            Lo que ofreces, cuánto cuesta y cuánto tiempo ocupa la silla.
          </p>
        </div>
        {services.data && services.data.length > 0 && (
          <Button onClick={() => setEditing({ mode: "create" })}>
            <Plus aria-hidden="true" />
            Nuevo servicio
          </Button>
        )}
      </header>

      {services.isPending && <PageLoading label="Cargando servicios…" />}
      {services.isError && (
        <PageError
          message="No pudimos cargar los servicios. Revisa tu conexión e inténtalo de nuevo."
          onRetry={() => void services.refetch()}
        />
      )}
      {services.data && services.data.length === 0 && (
        <EmptyServices onCreate={() => setEditing({ mode: "create" })} />
      )}
      {services.data && services.data.length > 0 && (
        <ul className="flex flex-col gap-2.5">
          {services.data.map((service) => (
            <li key={service.id}>
              <ServiceRow
                service={service}
                currency={business.currency}
                onEdit={() => setEditing({ mode: "edit", service })}
              />
            </li>
          ))}
        </ul>
      )}

      <Dialog open={editing !== null} onOpenChange={(open) => !open && close()}>
        {editing && (
          <DialogContent
            title={editing.mode === "create" ? "Nuevo servicio" : "Editar servicio"}
            description={
              editing.mode === "edit"
                ? "Los cambios de precio aplican a las citas y ventas nuevas."
                : undefined
            }
          >
            <ServiceForm
              businessId={business.id}
              service={editing.mode === "edit" ? editing.service : undefined}
              onDone={close}
            />
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}

function ServiceRow({
  service,
  currency,
  onEdit,
}: {
  service: Service;
  currency: string;
  onEdit: () => void;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-4 rounded-lg border border-line bg-surface p-4 sm:px-5",
        !service.active && "bg-sunken",
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn("text-[15px] font-semibold", !service.active && "text-ink-muted")}>
            {service.name}
          </span>
          {!service.active && <StatusPill tone="done">Inactivo</StatusPill>}
          {service.active && !service.visibleOnline && (
            <StatusPill tone="neutral">Solo en el local</StatusPill>
          )}
        </div>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-muted">
          <span className="font-semibold text-ink tabular-nums">
            {formatMoney(service.price, currency)}
          </span>
          <span>{formatDuration(service.durationMinutes)}</span>
          {service.active && service.visibleOnline && (
            <span className="inline-flex items-center gap-1">
              <Globe className="size-3.5" aria-hidden="true" />
              Reservable
            </span>
          )}
        </p>
        {service.description && (
          <p className="truncate text-[13px] text-ink-muted">{service.description}</p>
        )}
      </div>
      <Button variant="ghost" size="icon" onClick={onEdit} aria-label={`Editar ${service.name}`}>
        <Pencil aria-hidden="true" />
      </Button>
    </div>
  );
}

function EmptyServices({ onCreate }: { onCreate: () => void }) {
  return (
    <section className="flex flex-col items-center gap-3 rounded-lg border-[1.5px] border-dashed border-line-strong bg-surface px-6 py-12 text-center">
      <span
        aria-hidden="true"
        className="flex size-12 items-center justify-center rounded-full bg-brand-soft text-brand-ink"
      >
        <Scissors className="size-6" />
      </span>
      <h2 className="text-[17px] font-semibold">Agrega tu primer servicio</h2>
      <p className="max-w-[380px] text-sm leading-[21px] text-ink-muted">
        Empieza por los que más haces: un corte, la barba, el combo. La duración define cuánto
        espacio ocupa cada cita en la agenda.
      </p>
      <Button className="mt-1" onClick={onCreate}>
        <Plus aria-hidden="true" />
        Agregar servicio
      </Button>
    </section>
  );
}
