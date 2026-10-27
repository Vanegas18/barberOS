import type { Appointment } from "@barberos/contracts";
import { StatusPill } from "@/components/ui/status-pill";
import {
  STATUS_LABEL,
  STATUS_TONE,
  appointmentTotal,
  formatRange,
  isClosedOut,
  servicesSummary,
} from "@/features/appointments/labels";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

export function AppointmentCard({
  appointment,
  currency,
  barberName,
}: {
  appointment: Appointment;
  currency: string;
  barberName?: string;
}) {
  const closed = isClosedOut(appointment.status);
  const border =
    appointment.status === "in_service"
      ? "border-ink border-l-4"
      : appointment.status === "pending"
        ? "border-dashed border-pending-line"
        : "border-line";

  return (
    <article
      className={cn(
        "flex flex-col gap-2 rounded-md border bg-surface p-3.5",
        border,
        closed && "opacity-70",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-[15px] font-bold tabular-nums">{formatRange(appointment)}</p>
        <StatusPill tone={STATUS_TONE[appointment.status]}>
          {STATUS_LABEL[appointment.status]}
        </StatusPill>
      </div>
      <div className="flex flex-col gap-0.5">
        <p className={cn("text-[15px] font-semibold", closed && "line-through")}>
          {appointment.customer.name}
        </p>
        <p className="text-sm text-ink-muted">{servicesSummary(appointment)}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-[13px] text-ink-muted">
        <span className="font-semibold text-ink tabular-nums">
          {formatMoney(appointmentTotal(appointment), currency)}
        </span>
        {barberName && <span>· {barberName}</span>}
        {appointment.source === "walk_in" && <StatusPill tone="neutral">Sin cita</StatusPill>}
        {appointment.recordedAfter && <span>· Registrada después</span>}
      </div>
      {appointment.note && <p className="text-[13px] text-ink-soft">“{appointment.note}”</p>}
    </article>
  );
}
