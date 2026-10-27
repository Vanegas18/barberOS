"use client";

import { hasPermission } from "@barberos/contracts";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PageError, PageLoading } from "@/components/feedback/page-state";
import { Button } from "@/components/ui/button";
import { useDayAppointments } from "@/features/appointments/hooks";
import { useEmployees, useMyEmployee } from "@/features/employees/hooks";
import { useCurrentBusiness } from "@/features/panel/panel-context";
import { todayIn } from "@/features/schedules/labels";
import { useServices } from "@/features/services/hooks";
import { cn } from "@/lib/utils";
import { AgendaBoard, AppointmentList, type BoardColumn } from "./agenda-board";
import { DayNav } from "./day-nav";
import { SetupChecklist } from "./setup-checklist";

export function AgendaView({ date: requested }: { date: string | null }) {
  const business = useCurrentBusiness();
  const router = useRouter();
  const [today] = useState(() => todayIn(business.timezone));
  const date = requested ?? today;
  const isManager = hasPermission(business.role, "appointments:read");
  const canWrite =
    hasPermission(business.role, "appointments:manage") ||
    hasPermission(business.role, "appointments:manage_own");

  const employees = useEmployees(business.id, isManager);
  const services = useServices(business.id);
  const me = useMyEmployee(business.id, !isManager);
  const appointments = useDayAppointments(business.id, date);

  const goTo = (next: string) => {
    const query = next === today ? "" : `?fecha=${next}`;
    router.replace(`/${business.slug}${query}`, { scroll: false });
  };

  const team = employees.data ?? [];
  const hasBarbers = team.some((e) => e.active);
  const hasServices = services.data?.some((s) => s.active) ?? false;
  const setupDone =
    !isManager || (employees.isSuccess && services.isSuccess && hasBarbers && hasServices);
  const dayList = appointments.data ?? [];

  const withAppointments = new Set(dayList.map((a) => a.employeeId));
  const columns: BoardColumn[] = team
    .filter((e) => e.active || withAppointments.has(e.id))
    .map((e) => ({ id: e.id, name: e.displayName }));

  return (
    <div className="mx-auto flex w-full max-w-300 flex-col gap-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-col gap-3">
          <h1 className="text-[28px] leading-9 font-bold tracking-[-0.01em]">
            {isManager ? "Agenda" : "Mi agenda"}
          </h1>
          <DayNav date={date} today={today} onChange={goTo} />
        </div>
        {canWrite && (
          <div className="flex flex-col gap-1.5 lg:items-end">
            <div className="flex gap-2">
              <Button variant="secondary" disabled aria-describedby="agenda-soon">
                Sin cita
              </Button>
              <Button disabled aria-describedby="agenda-soon">
                <Plus aria-hidden="true" />
                Nueva cita
              </Button>
            </div>
            <p id="agenda-soon" className="text-[13px] text-ink-muted">
              Muy pronto podrás agendar desde aquí.
            </p>
          </div>
        )}
      </header>

      <div
        className={cn(
          "grid gap-6",
          isManager && !setupDone && "lg:grid-cols-[minmax(0,1fr)_340px]",
        )}
      >
        <section aria-label="Citas del día" className="flex min-w-0 flex-col gap-4">
          {appointments.isPending && <PageLoading label="Cargando la agenda…" />}
          {appointments.isError && (
            <PageError
              message="No pudimos cargar la agenda. Revisa tu conexión e inténtalo de nuevo."
              onRetry={() => void appointments.refetch()}
            />
          )}
          {appointments.isSuccess && isManager && columns.length > 0 && (
            <AgendaBoard columns={columns} appointments={dayList} currency={business.currency} />
          )}
          {appointments.isSuccess && isManager && columns.length === 0 && employees.isSuccess && (
            <EmptyState
              title="Todavía no hay sillas en la agenda"
              text="Cuando agregues barberos, aquí verás la silla de cada uno: quién llega, quién está atendiendo y quién falta."
            />
          )}
          {appointments.isSuccess && !isManager && me.isSuccess && me.data === null && (
            <EmptyState
              title="Aún no tienes agenda"
              text="Todavía no estás vinculado como barbero. Pídele al dueño que te envíe una invitación desde Equipo."
            />
          )}
          {appointments.isSuccess && !isManager && me.data && (
            <AppointmentList appointments={dayList} currency={business.currency} />
          )}
        </section>

        {isManager && employees.isSuccess && services.isSuccess && !setupDone && (
          <SetupChecklist hasBarbers={hasBarbers} hasServices={hasServices} />
        )}
      </div>
    </div>
  );
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-md border-[1.5px] border-dashed border-line-strong bg-surface px-6 py-12 text-center">
      <p className="text-[15px] font-semibold">{title}</p>
      <p className="max-w-85 text-sm leading-5.25 text-ink-muted">{text}</p>
    </div>
  );
}
