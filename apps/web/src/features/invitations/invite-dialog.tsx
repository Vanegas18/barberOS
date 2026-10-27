"use client";

import type { CreatedInvitation, Employee } from "@barberos/contracts";
import { Check, Copy, MessageCircle } from "lucide-react";
import { useState } from "react";
import { FormAlert } from "@/components/forms/form-alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiError, errorMessage } from "@/lib/api/client";
import { useCreateInvitation } from "./hooks";
import { inviteMessage, whatsappLink } from "./share";

export function InviteDialogBody({
  businessId,
  businessName,
  employee,
  onDone,
}: {
  businessId: string;
  businessName: string;
  employee: Employee | null;
  onDone: () => void;
}) {
  const create = useCreateInvitation(businessId);
  const [created, setCreated] = useState<CreatedInvitation | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string>();
  const role = employee ? "barber" : "admin";

  const generate = async () => {
    setError(undefined);
    try {
      setCreated(await create.mutateAsync({ role, employeeId: employee?.id }));
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 409
          ? "Este barbero ya tiene cuenta o está desactivado."
          : errorMessage(err),
      );
    }
  };

  if (!created) {
    return (
      <div className="flex flex-col gap-4">
        <FormAlert message={error} />
        <p className="text-[15px] leading-6 text-ink-soft">
          {employee
            ? `Vamos a crear un enlace para que ${employee.displayName} entre con su propia cuenta y vea su agenda. Su horario y su regla de ganancia ya quedan listos.`
            : "Vamos a crear un enlace para que alguien entre como administrador: podrá gestionar la agenda, el equipo y los servicios, pero no lo que gana cada barbero."}
        </p>
        <p className="rounded-md bg-ground px-4 py-3 text-sm text-ink-muted">
          El enlace sirve una sola vez y vence en 7 días.
        </p>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" onClick={onDone}>
            Cancelar
          </Button>
          <Button
            type="button"
            size="lg"
            onClick={generate}
            disabled={create.isPending}
            aria-busy={create.isPending}
          >
            {create.isPending ? "Creando…" : "Crear enlace"}
          </Button>
        </div>
      </div>
    );
  }

  const message = inviteMessage({
    personName: employee?.displayName ?? null,
    businessName,
    role,
    url: created.inviteUrl,
    expiresAt: created.invitation.expiresAt,
  });

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(created.inviteUrl);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[15px] text-ink-soft">
        Listo. Envíalo ahora: por seguridad no podremos mostrarte este enlace otra vez.
      </p>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="invite-url" className="text-[13px] font-semibold">
          Enlace de invitación
        </label>
        <Input
          id="invite-url"
          readOnly
          value={created.inviteUrl}
          onFocus={(e) => e.target.select()}
        />
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button asChild size="lg" className="sm:flex-1">
          <a
            href={whatsappLink(message, employee?.phone ?? null)}
            target="_blank"
            rel="noopener noreferrer"
          >
            <MessageCircle aria-hidden="true" />
            Enviar por WhatsApp
          </a>
        </Button>
        <Button type="button" variant="secondary" size="lg" className="sm:flex-1" onClick={copy}>
          {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
          {copied ? "Copiado" : "Copiar enlace"}
        </Button>
      </div>
      <p aria-live="polite" className="sr-only">
        {copied ? "Enlace copiado" : ""}
      </p>
      <div className="flex justify-end">
        <Button type="button" variant="ghost" onClick={onDone}>
          Cerrar
        </Button>
      </div>
    </div>
  );
}
