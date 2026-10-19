import type { Metadata } from "next";
import { Logo } from "@/components/brand/logo";
import { SessionPreview } from "@/features/auth/session-preview";

export const metadata: Metadata = { title: "Inicio" };

export default function InicioPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-8 px-4 py-10">
      <Logo />
      <SessionPreview />
    </main>
  );
}
