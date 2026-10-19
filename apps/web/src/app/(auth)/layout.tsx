import type { ReactNode } from "react";
import { Logo } from "@/components/brand/logo";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <div aria-hidden="true" className="barber-pole h-1 shrink-0" />
      <div className="grid flex-1 lg:grid-cols-2">
        <aside className="hidden flex-col justify-between bg-brand-soft p-10 lg:flex">
          <Logo />
          <div className="flex max-w-md flex-col gap-5">
            <p className="text-3xl leading-tight font-bold tracking-tight text-ink">
              La agenda, las ventas y la caja de tu barbería, en orden.
            </p>
            <ul className="flex flex-col gap-2.5 text-ink-soft">
              <li>Citas de WhatsApp y clientes sin cita en un solo lugar.</li>
              <li>Comisiones calculadas automáticamente.</li>
              <li>Cada barbero ve su agenda y sus ganancias desde el celular.</li>
            </ul>
          </div>
          <p className="text-xs text-ink-muted">by Vanegas Solutions</p>
        </aside>

        <main className="flex flex-col items-center justify-center px-4 py-10">
          <div className="flex w-full max-w-sm flex-col gap-8">
            <Logo className="lg:hidden" />
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
