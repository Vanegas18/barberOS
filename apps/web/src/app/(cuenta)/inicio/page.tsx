import type { Metadata } from "next";
import { HomeRedirect } from "@/features/businesses/home-redirect";

export const metadata: Metadata = { title: "Inicio" };

export default function InicioPage() {
  return (
    <div className="w-full max-w-[640px]">
      <h1 className="sr-only">Inicio</h1>
      <HomeRedirect />
    </div>
  );
}
