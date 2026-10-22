import type { Metadata } from "next";
import { RequireSection } from "@/features/panel/require-section";
import { ServicesManager } from "@/features/services/services-manager";

export const metadata: Metadata = { title: "Servicios y precios" };

export default function ServicesPage() {
  return (
    <RequireSection segment="ajustes">
      <ServicesManager />
    </RequireSection>
  );
}
