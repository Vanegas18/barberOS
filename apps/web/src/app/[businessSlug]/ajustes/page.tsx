import type { Metadata } from "next";
import { RequireSection } from "@/features/panel/require-section";
import { SettingsHub } from "@/features/settings/settings-hub";

export const metadata: Metadata = { title: "Ajustes" };

export default function SettingsPage() {
  return (
    <RequireSection segment="ajustes">
      <SettingsHub />
    </RequireSection>
  );
}
