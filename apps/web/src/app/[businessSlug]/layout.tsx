import type { ReactNode } from "react";
import { PanelShell } from "@/features/panel/panel-shell";

export default async function PanelLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ businessSlug: string }>;
}) {
  const { businessSlug } = await params;
  return <PanelShell slug={businessSlug}>{children}</PanelShell>;
}
