"use client";

import type { BusinessWithRole } from "@barberos/contracts";
import { createContext, useContext } from "react";

const PanelContext = createContext<BusinessWithRole | null>(null);

export const PanelProvider = PanelContext.Provider;

export function useCurrentBusiness(): BusinessWithRole {
  const business = useContext(PanelContext);
  if (!business) throw new Error("useCurrentBusiness se usa dentro del panel");
  return business;
}
