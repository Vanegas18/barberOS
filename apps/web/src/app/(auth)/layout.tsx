import type { ReactNode } from "react";
import { Logo } from "@/components/brand/logo";

const PROMISE = "La agenda de tu barbería, en orden.";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-surface lg:grid lg:grid-cols-2">
      <header className="flex flex-col gap-6 rounded-b-[28px] bg-brand px-5 pt-5 pb-7 lg:hidden">
        <Logo />
        <p className="text-[26px] leading-[30px] font-bold tracking-[-0.02em] text-ink">
          {PROMISE}
        </p>
      </header>

      <aside className="hidden flex-col justify-between gap-10 rounded-r-[28px] bg-brand px-12 py-10 lg:flex">
        <Logo />
        <div className="flex max-w-[460px] flex-col gap-7">
          <p className="text-4xl leading-10 font-bold tracking-[-0.025em] text-ink">{PROMISE}</p>
          <ChairPreview />
          <p className="text-[15px] leading-[22px] text-ink-soft">
            Cada barbero ve su agenda y sus ganancias desde el celular. Tú ves todas las sillas.
          </p>
        </div>
        <p className="text-[13px] text-ink-soft">by Vanegas Solutions</p>
      </aside>

      <main className="flex flex-1 flex-col items-center px-5 pt-7 pb-8 lg:justify-center lg:px-6 lg:py-10">
        <div className="flex w-full max-w-[400px] flex-col gap-7">{children}</div>
        <p className="mt-auto pt-8 text-[13px] text-ink-muted lg:hidden">by Vanegas Solutions</p>
      </main>
    </div>
  );
}

function ChairPreview() {
  return (
    <div
      aria-hidden="true"
      className="flex max-w-[360px] flex-col gap-3 rounded-lg bg-surface p-[18px]"
    >
      <div className="flex items-center gap-2.5">
        <span className="flex size-9 items-center justify-center rounded-full bg-person-c text-[13px] font-bold">
          J
        </span>
        <span className="flex flex-1 flex-col">
          <span className="text-sm font-semibold">Jhonatan</span>
          <span className="text-xs text-ink-muted">Silla 3</span>
        </span>
        <span className="flex h-6 items-center rounded-full bg-brand px-2.5 text-xs font-semibold">
          Libre
        </span>
      </div>
      <span className="text-lg font-semibold">Libre hasta las 12:30</span>
      <span className="flex h-10 items-center justify-center rounded-full bg-ink text-sm font-semibold text-white">
        Atender sin cita aquí
      </span>
    </div>
  );
}
