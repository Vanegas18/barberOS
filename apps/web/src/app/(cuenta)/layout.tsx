import type { ReactNode } from "react";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { AccountBar } from "@/features/auth/account-bar";

export default function CuentaLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-ground">
      <header className="flex h-16 shrink-0 items-center justify-between gap-4 rounded-b-[24px] bg-brand px-4 sm:rounded-none sm:px-8">
        <Link href="/inicio" aria-label="BarberOS, inicio" className="rounded-md">
          <Logo />
        </Link>
        <AccountBar />
      </header>
      <main className="flex flex-1 justify-center px-4 py-8 sm:px-6 sm:py-12">{children}</main>
    </div>
  );
}
