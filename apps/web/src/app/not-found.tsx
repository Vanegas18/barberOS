import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Página no encontrada" };

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col bg-ground">
      <header className="flex h-16 shrink-0 items-center rounded-b-[24px] bg-brand px-4 sm:rounded-none sm:px-8">
        <Link href="/inicio" aria-label="BarberOS, inicio" className="rounded-md">
          <Logo />
        </Link>
      </header>
      <main className="flex flex-1 items-start justify-center px-4 py-10 sm:items-center">
        <section className="flex w-full max-w-[480px] flex-col gap-4 rounded-xl border border-line bg-surface p-6 sm:p-8">
          <p className="text-sm font-semibold text-ink-muted">Error 404</p>
          <h1 className="text-[26px] leading-8 font-bold tracking-[-0.01em]">
            Esta página no existe
          </h1>
          <p className="text-[15px] leading-[23px] text-ink-soft">
            Puede que el enlace esté mal escrito o que no tengas acceso a esa barbería.
          </p>
          <Button asChild size="lg" className="mt-2 w-full sm:w-auto sm:self-start">
            <Link href="/inicio">Ir a mi barbería</Link>
          </Button>
        </section>
      </main>
    </div>
  );
}
