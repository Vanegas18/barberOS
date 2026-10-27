import type { Metadata } from "next";
import { TeamManager } from "@/features/employees/team-manager";
import { RequireSection } from "@/features/panel/require-section";

export const metadata: Metadata = { title: "Equipo" };

export default function TeamPage() {
  return (
    <RequireSection segment="equipo">
      <TeamManager />
    </RequireSection>
  );
}
