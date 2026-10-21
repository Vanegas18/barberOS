import type { Metadata } from "next";
import { AgendaEmpty } from "@/features/agenda/agenda-empty";

export const metadata: Metadata = { title: "Agenda" };

export default function AgendaPage() {
  return <AgendaEmpty />;
}
