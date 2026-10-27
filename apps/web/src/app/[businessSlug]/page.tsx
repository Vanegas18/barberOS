import type { Metadata } from "next";
import { AgendaView } from "@/features/agenda/agenda-view";
import { parseDateParam } from "@/features/appointments/labels";

export const metadata: Metadata = { title: "Agenda" };

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ fecha?: string | string[] }>;
}) {
  const { fecha } = await searchParams;
  return <AgendaView date={parseDateParam(typeof fecha === "string" ? fecha : undefined)} />;
}
