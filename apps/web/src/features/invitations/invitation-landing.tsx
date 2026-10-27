"use client";

import { CircleAlert, UserRoundCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PageLoading } from "@/components/feedback/page-state";
import { FormAlert } from "@/components/forms/form-alert";
import { Button } from "@/components/ui/button";
import { useLogout, useMe } from "@/features/auth/hooks";
import { ApiError, errorMessage } from "@/lib/api/client";
import { withNext } from "@/lib/safe-next";
import { useAcceptInvitation, useInvitationPreview } from "./hooks";

const dateFormat = new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "long" });

const ROLE_TEXT = { barber: "barbero", admin: "administrador" } as const;

export function InvitationLanding({ token, hasSession }: { token: string; hasSession: boolean }) {
  const preview = useInvitationPreview(token);
  const next = `/invitacion/${token}`;

  if (preview.isPending) return <PageLoading label="Abriendo la invitación…" />;

  if (preview.isError) {
    const invalid =
      preview.error instanceof ApiError &&
      (preview.error.status === 404 || preview.error.status === 422);
    return (
      <Card>
        <span
          aria-hidden="true"
          className="flex size-12 items-center justify-center rounded-full bg-danger-soft text-danger"
        >
          <CircleAlert className="size-6" />
        </span>
        <h1 className="text-[24px] leading-8 font-bold tracking-[-0.01em]">
          {invalid ? "Esta invitación ya no sirve" : "No pudimos abrir la invitación"}
        </h1>
        <p className="text-[15px] leading-6 text-ink-soft">
          {invalid
            ? "Puede que ya se haya usado, que haya vencido o que la hayan anulado. Pídele a tu barbería que te envíe una nueva."
            : errorMessage(preview.error)}
        </p>
        <Button asChild variant="secondary" className="self-start">
          <Link href={hasSession ? "/inicio" : "/ingresar"}>Ir a BarberOS</Link>
        </Button>
      </Card>
    );
  }

  const invitation = preview.data;

  return (
    <Card>
      <span
        aria-hidden="true"
        className="flex size-12 items-center justify-center rounded-full bg-brand text-ink"
      >
        <UserRoundCheck className="size-6" />
      </span>
      <div className="flex flex-col gap-1.5">
        <p className="text-sm font-semibold text-ink-muted">Te invitaron a</p>
        <h1 className="text-[26px] leading-8 font-bold tracking-[-0.01em] text-balance">
          {invitation.businessName}
        </h1>
        <p className="text-[15px] leading-6 text-ink-soft">
          Como {ROLE_TEXT[invitation.role]}
          {invitation.employeeName ? ` (${invitation.employeeName})` : ""}. La invitación vence el{" "}
          {dateFormat.format(new Date(invitation.expiresAt))}.
        </p>
      </div>

      {hasSession ? (
        <AcceptBox token={token} />
      ) : (
        <div className="flex flex-col gap-2 border-t border-line-soft pt-4">
          <Button asChild size="lg">
            <Link href={withNext("/registro", next)}>Crear mi cuenta</Link>
          </Button>
          <Button asChild variant="ghost" size="lg">
            <Link href={withNext("/ingresar", next)}>Ya tengo cuenta</Link>
          </Button>
        </div>
      )}
    </Card>
  );
}

function AcceptBox({ token }: { token: string }) {
  const router = useRouter();
  const me = useMe();
  const logout = useLogout();
  const accept = useAcceptInvitation(token);
  const [error, setError] = useState<string>();

  const onAccept = async () => {
    setError(undefined);
    try {
      const result = await accept.mutateAsync();
      router.replace(`/${result.slug}`);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError("Ya perteneces a esta barbería con esta cuenta.");
      } else if (err instanceof ApiError && err.status === 404) {
        setError("Esta invitación ya no sirve. Pide una nueva.");
      } else if (err instanceof ApiError && err.status === 401) {
        setError("Tu sesión venció. Vuelve a ingresar para aceptar.");
      } else {
        setError(errorMessage(err));
      }
    }
  };

  return (
    <div className="flex flex-col gap-3 border-t border-line-soft pt-4">
      <FormAlert message={error} />
      <p className="text-sm text-ink-muted">
        Vas a entrar como{" "}
        <span className="font-semibold text-ink">{me.data?.name ?? "tu cuenta"}</span>.
      </p>
      <Button size="lg" onClick={onAccept} disabled={accept.isPending} aria-busy={accept.isPending}>
        {accept.isPending ? "Aceptando…" : "Aceptar invitación"}
      </Button>
      <Button
        variant="ghost"
        onClick={() => logout.mutate()}
        disabled={logout.isPending}
        className="self-center"
      >
        No soy yo, cerrar sesión
      </Button>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <section className="flex w-full max-w-120 flex-col gap-5 rounded-xl border border-line bg-surface p-6 sm:p-8">
      {children}
    </section>
  );
}
