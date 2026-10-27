"use client";

import { hasPermission, type Invitation, type Role } from "@barberos/contracts";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { useRevokeInvitation } from "./hooks";

const dateFormat = new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short" });

export function PendingInvitations({
  businessId,
  role,
  invitations,
}: {
  businessId: string;
  role: Role;
  invitations: Invitation[];
}) {
  const revoke = useRevokeInvitation(businessId);
  if (invitations.length === 0) return null;
  const canRevokeAdmins = hasPermission(role, "members:manage");

  return (
    <section aria-labelledby="pending-title" className="flex flex-col gap-2.5">
      <h2 id="pending-title" className="text-sm font-semibold text-ink-muted">
        Invitaciones pendientes
      </h2>
      <ul className="flex flex-col gap-2">
        {invitations.map((invitation) => {
          const label =
            invitation.role === "admin" ? "Administrador" : (invitation.employeeName ?? "Barbero");
          const canRevoke = invitation.role === "barber" || canRevokeAdmins;
          return (
            <li
              key={invitation.id}
              className="flex items-center gap-3 rounded-md border border-dashed border-pending-line bg-brand-soft px-4 py-2.5"
            >
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                <span className="text-sm font-semibold">{label}</span>
                <StatusPill tone="pending">
                  Vence el {dateFormat.format(new Date(invitation.expiresAt))}
                </StatusPill>
              </div>
              {canRevoke && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => revoke.mutate(invitation.id)}
                  disabled={revoke.isPending}
                  aria-label={`Anular la invitación de ${label}`}
                >
                  <X aria-hidden="true" />
                </Button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
