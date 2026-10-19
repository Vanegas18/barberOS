import { ROLES } from "@barberos/contracts";
import { SystemStatus } from "./system-status";

export default function HomePage() {
  return (
    <main className="flex min-h-dvh flex-col">
      <div aria-hidden="true" className="barber-pole h-1" />
      <div className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center gap-6 px-4 py-12">
        <div className="flex items-center gap-3">
          <span aria-hidden="true" className="barber-pole size-9 rounded-lg border border-line" />
          <h1 className="text-2xl font-bold tracking-tight">
            Barber<span className="text-pole">OS</span>
          </h1>
        </div>

        <section className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-5">
          <h2 className="text-base font-semibold">Estado del sistema</h2>
          <SystemStatus />
          <p className="text-sm text-muted">
            Roles desde contracts: <span className="font-mono">{ROLES.join(" · ")}</span>
          </p>
        </section>

        <p className="text-xs text-muted">by Vanegas Solutions</p>
      </div>
    </main>
  );
}
