"use client";

import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { PageError, PageLoading } from "@/components/feedback/page-state";
import { useMyBusinesses } from "@/features/businesses/hooks";
import { BlockedScreen } from "./blocked-screen";
import { BottomNav, MobileHeader } from "./mobile-nav";
import { PanelProvider } from "./panel-context";
import { Sidebar } from "./sidebar";

export function PanelShell({ slug, children }: { slug: string; children: ReactNode }) {
  const businesses = useMyBusinesses();

  if (businesses.isPending) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-ground">
        <PageLoading label="Abriendo tu barbería…" />
      </div>
    );
  }

  if (businesses.isError) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-ground px-4">
        <div className="w-full max-w-[480px]">
          <PageError
            message="No pudimos abrir la barbería. Revisa tu conexión e inténtalo de nuevo."
            onRetry={() => void businesses.refetch()}
          />
        </div>
      </div>
    );
  }

  const business = businesses.data.find((b) => b.slug === slug);
  if (!business) notFound();

  if (business.access !== "ok") {
    return (
      <BlockedScreen
        business={business}
        access={business.access}
        hasOtherBusinesses={businesses.data.length > 1}
      />
    );
  }

  return (
    <PanelProvider value={business}>
      <div className="flex min-h-dvh bg-ground">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <MobileHeader />
          <main className="flex-1 px-4 pt-5 pb-[calc(96px+env(safe-area-inset-bottom))] sm:px-6 lg:px-10 lg:py-8">
            {children}
          </main>
        </div>
        <BottomNav />
      </div>
    </PanelProvider>
  );
}
