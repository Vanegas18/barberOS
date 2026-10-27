"use client";

import { hasPermission, type Employee } from "@barberos/contracts";
import { Armchair, Clock, Pencil, Plus, UserRoundPlus } from "lucide-react";
import { useState } from "react";
import { PageError, PageLoading } from "@/components/feedback/page-state";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { StatusPill } from "@/components/ui/status-pill";
import { useMe } from "@/features/auth/hooks";
import { personInitials } from "@/features/businesses/labels";
import { useCurrentBusiness } from "@/features/panel/panel-context";
import { summarizeWeek } from "@/features/schedules/labels";
import { ScheduleEditor } from "@/features/schedules/schedule-editor";
import { cn } from "@/lib/utils";
import { EmployeeForm } from "./employee-form";
import { useEmployees } from "./hooks";
import { avatarTone, earningRuleLabel } from "./labels";

type Editing =
  | { mode: "create" }
  | { mode: "self" }
  | { mode: "edit"; employee: Employee }
  | { mode: "schedule"; employee: Employee }
  | null;

export function TeamManager() {
  const business = useCurrentBusiness();
  const me = useMe();
  const employees = useEmployees(business.id);
  const [editing, setEditing] = useState<Editing>(null);
  const close = () => setEditing(null);

  const canConfigureEarnings = hasPermission(business.role, "earnings:configure");
  const list = employees.data ?? [];
  const iAmEmployee = list.some((e) => e.isMe);

  return (
    <div className="mx-auto flex w-full max-w-220 flex-col gap-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-[28px] leading-9 font-bold tracking-[-0.01em]">Equipo</h1>
          <p className="text-[15px] text-ink-muted">
            Quién atiende en tu barbería y cuánto gana cada uno.
          </p>
        </div>
        {list.length > 0 && (
          <Button onClick={() => setEditing({ mode: "create" })}>
            <Plus aria-hidden="true" />
            Agregar barbero
          </Button>
        )}
      </header>

      {employees.isPending && <PageLoading label="Cargando tu equipo…" />}
      {employees.isError && (
        <PageError
          message="No pudimos cargar el equipo. Revisa tu conexión e inténtalo de nuevo."
          onRetry={() => void employees.refetch()}
        />
      )}

      {employees.data && !iAmEmployee && <SelfCard onClick={() => setEditing({ mode: "self" })} />}

      {employees.data && list.length === 0 && (
        <EmptyTeam onCreate={() => setEditing({ mode: "create" })} />
      )}

      {list.length > 0 && (
        <ul className="flex flex-col gap-2.5">
          {list.map((employee, index) => (
            <li key={employee.id}>
              <EmployeeRow
                employee={employee}
                tone={avatarTone(index)}
                ruleLabel={
                  canConfigureEarnings
                    ? earningRuleLabel(employee.earningRule, business.currency)
                    : null
                }
                onEdit={() => setEditing({ mode: "edit", employee })}
                onSchedule={() => setEditing({ mode: "schedule", employee })}
              />
            </li>
          ))}
        </ul>
      )}

      <Dialog open={editing !== null} onOpenChange={(open) => !open && close()}>
        {editing?.mode === "schedule" && (
          <DialogContent
            title={`Horario de ${editing.employee.displayName}`}
            className="sm:max-w-150"
          >
            <ScheduleEditor
              businessId={business.id}
              employee={editing.employee}
              timeZone={business.timezone}
              onDone={close}
            />
          </DialogContent>
        )}
        {editing && editing.mode !== "schedule" && (
          <DialogContent
            title={
              editing.mode === "edit"
                ? `Editar a ${editing.employee.displayName}`
                : editing.mode === "self"
                  ? "Yo también atiendo"
                  : "Agregar barbero"
            }
            description={
              editing.mode === "create"
                ? "Después podrás invitarlo para que vea su agenda en el celular."
                : editing.mode === "self"
                  ? "Aparecerás en la agenda como un barbero más."
                  : undefined
            }
          >
            <EmployeeForm
              businessId={business.id}
              employee={editing.mode === "edit" ? editing.employee : undefined}
              canConfigureEarnings={canConfigureEarnings}
              linkSelf={editing.mode === "self"}
              defaultName={editing.mode === "self" ? (me.data?.name.split(" ")[0] ?? "") : ""}
              onDone={close}
            />
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}

function EmployeeRow({
  employee,
  tone,
  ruleLabel,
  onEdit,
  onSchedule,
}: {
  employee: Employee;
  tone: string;
  ruleLabel: string | null;
  onEdit: () => void;
  onSchedule: () => void;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-4 rounded-lg border border-line bg-surface p-4 sm:px-5",
        !employee.active && "bg-sunken",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "flex size-11 shrink-0 items-center justify-center rounded-full text-sm font-bold text-ink",
          employee.active ? tone : "bg-line",
        )}
      >
        {personInitials(employee.displayName)}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn("text-[15px] font-semibold", !employee.active && "text-ink-muted")}>
            {employee.displayName}
          </span>
          {employee.isMe && <StatusPill tone="free">Tú</StatusPill>}
          {!employee.active && <StatusPill tone="done">Inactivo</StatusPill>}
          {employee.active && !employee.isMe && (
            <StatusPill tone={employee.hasAccount ? "neutral" : "pending"}>
              {employee.hasAccount ? "Con cuenta" : "Sin cuenta"}
            </StatusPill>
          )}
        </div>
        {ruleLabel && <p className="text-sm text-ink-muted">{ruleLabel}</p>}
        {employee.active && (
          <p className="text-[13px] text-ink-muted">{summarizeWeek(employee.weeklySchedule)}</p>
        )}
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={onSchedule}
        aria-label={`Horario de ${employee.displayName}`}
      >
        <Clock aria-hidden="true" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={onEdit}
        aria-label={`Editar a ${employee.displayName}`}
      >
        <Pencil aria-hidden="true" />
      </Button>
    </div>
  );
}

function SelfCard({ onClick }: { onClick: () => void }) {
  return (
    <section className="flex flex-col gap-3 rounded-lg bg-brand-soft p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-ink text-brand"
        >
          <Armchair className="size-5" />
        </span>
        <div className="flex flex-col gap-0.5">
          <h2 className="text-[15px] font-semibold">¿Tú también motilas?</h2>
          <p className="text-sm text-brand-ink">
            Agrégate al equipo para tener tu propia columna en la agenda.
          </p>
        </div>
      </div>
      <Button variant="default" onClick={onClick} className="sm:shrink-0">
        Yo también atiendo
      </Button>
    </section>
  );
}

function EmptyTeam({ onCreate }: { onCreate: () => void }) {
  return (
    <section className="flex flex-col items-center gap-3 rounded-lg border-[1.5px] border-dashed border-line-strong bg-surface px-6 py-12 text-center">
      <span
        aria-hidden="true"
        className="flex size-12 items-center justify-center rounded-full bg-brand-soft text-brand-ink"
      >
        <UserRoundPlus className="size-6" />
      </span>
      <h2 className="text-[17px] font-semibold">Agrega a tus barberos</h2>
      <p className="max-w-95 text-sm leading-5.25 text-ink-muted">
        Cada barbero tiene su columna en la agenda y su propia regla de ganancia. No necesitan
        cuenta para aparecer.
      </p>
      <Button className="mt-1" onClick={onCreate}>
        <Plus aria-hidden="true" />
        Agregar barbero
      </Button>
    </section>
  );
}
