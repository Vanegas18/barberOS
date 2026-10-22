"use client";

import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { navFor } from "./nav";
import { useCurrentBusiness } from "./panel-context";

export function RequireSection({ segment, children }: { segment: string; children: ReactNode }) {
  const business = useCurrentBusiness();
  if (!navFor(business.role).some((item) => item.segment === segment)) notFound();
  return children;
}
