"use client";

import { ArrowLeftRight, LogOut, MessageCircle } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { support } from "@/config/support";
import { useLogout } from "@/features/auth/hooks";
import type { BusinessWithRole } from "@barberos/contracts";

type BlockedAccess = "suspended" | "trial_expired";

const COPY: Record<
  BlockedAccess,
  {
    owner: { title: string; body: string; whatsapp: string };
    team: { title: string; body: string };
  }
> = {
  suspended: {
    owner: {
      title: "Tu barbería está suspendida",
      body: "Las citas, las ventas y la caja están en pausa. Tus datos siguen guardados: escríbenos y la reactivamos.",
      whatsapp: "Hola, quiero reactivar mi barbería en BarberOS",
    },
    team: {
      title: "Esta barbería está en pausa",
      body: "Por ahora no se pueden ver ni crear citas. Avísale al dueño; tu información sigue guardada.",
    },
  },
  trial_expired: {
    owner: {
      title: "Tu prueba gratis terminó",
      body: "Activa un plan para seguir usando BarberOS. No se borró nada: todo sigue como lo dejaste.",
      whatsapp: "Hola, mi prueba de BarberOS terminó y quiero activar un plan",
    },
    team: {
      title: "La prueba de esta barbería terminó",
      body: "El dueño tiene que activar un plan para seguir. Avísale; tu información sigue guardada.",
    },
  },
};

export function BlockedScreen({
  business,
  access,
  hasOtherBusinesses,
}: {
  business: BusinessWithRole;
  access: BlockedAccess;
  hasOtherBusinesses: boolean;
}) {
  const logout = useLogout();
  const isOwner = business.role === "owner";
  const copy = isOwner ? COPY[access].owner : COPY[access].team;
  const whatsapp = isOwner
    ? support.whatsappUrl(`${COPY[access].owner.whatsapp}: ${business.name} (${business.slug})`)
    : null;

  return (
    <div className="flex min-h-dvh flex-col bg-ground">
      <header className="flex h-16 shrink-0 items-center rounded-b-[24px] bg-brand px-4 sm:rounded-none sm:px-8">
        <Logo />
      </header>
      <main className="flex flex-1 items-start justify-center px-4 py-10 sm:items-center">
        <section
          aria-labelledby="blocked-title"
          className="flex w-full max-w-[480px] flex-col gap-5 rounded-xl border border-line bg-surface p-6 sm:p-8"
        >
          <p className="text-sm font-semibold text-ink-muted">{business.name}</p>
          <h1
            id="blocked-title"
            className="text-[26px] leading-8 font-bold tracking-[-0.01em] text-balance"
          >
            {copy.title}
          </h1>
          <p className="text-[15px] leading-[23px] text-ink-soft">{copy.body}</p>

          {isOwner &&
            (whatsapp ? (
              <Button asChild size="lg" className="w-full">
                <a href={whatsapp} target="_blank" rel="noopener noreferrer">
                  <MessageCircle aria-hidden="true" />
                  Escribir a soporte por WhatsApp
                </a>
              </Button>
            ) : (
              <p className="rounded-md bg-sunken px-4 py-3 text-sm text-ink-soft">
                Contacta a soporte de Vanegas Solutions para resolverlo.
              </p>
            ))}

          <div className="flex flex-col gap-2 border-t border-line-soft pt-4 sm:flex-row">
            {hasOtherBusinesses && (
              <Button asChild variant="secondary" className="sm:flex-1">
                <Link href="/negocios">
                  <ArrowLeftRight aria-hidden="true" />
                  Cambiar de negocio
                </Link>
              </Button>
            )}
            <Button
              variant="ghost"
              className="sm:flex-1"
              onClick={() => logout.mutate()}
              disabled={logout.isPending}
            >
              <LogOut aria-hidden="true" />
              Cerrar sesión
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
}
