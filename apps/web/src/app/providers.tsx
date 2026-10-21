"use client";

import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { businessKeys } from "@/features/businesses/hooks";
import { ApiError } from "@/lib/api/client";

const BLOCKED_CODES = new Set(["BUSINESS_SUSPENDED", "TRIAL_EXPIRED"]);

function makeQueryClient() {
  const onBlocked = (error: Error) => {
    if (error instanceof ApiError && error.status === 403 && BLOCKED_CODES.has(error.code)) {
      void client.invalidateQueries({ queryKey: businessKeys.mine });
    }
  };

  const client: QueryClient = new QueryClient({
    queryCache: new QueryCache({
      onError: (error) => {
        if (error instanceof ApiError && error.status === 401) window.location.replace("/ingresar");
        onBlocked(error);
      },
    }),
    mutationCache: new MutationCache({ onError: onBlocked }),
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: (count, error) =>
          !(error instanceof ApiError && error.status >= 400 && error.status < 500) && count < 2,
      },
      mutations: { retry: false },
    },
  });
  return client;
}

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(makeQueryClient);
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
