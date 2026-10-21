import type { Metadata } from "next";
import { BusinessPicker } from "@/features/businesses/business-picker";

export const metadata: Metadata = { title: "Tus negocios" };

export default function NegociosPage() {
  return (
    <div className="flex w-full max-w-[640px] flex-col gap-6">
      <BusinessPicker />
    </div>
  );
}
