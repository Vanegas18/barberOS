"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { PageError, PageLoading } from "@/components/feedback/page-state";
import { errorMessage } from "@/lib/api/client";
import { useMyBusinesses } from "./hooks";

export function HomeRedirect() {
  const router = useRouter();
  const businesses = useMyBusinesses();

  const target =
    businesses.data === undefined
      ? null
      : businesses.data.length === 0
        ? "/negocios/nuevo"
        : businesses.data.length === 1
          ? `/${businesses.data[0]!.slug}`
          : "/negocios";

  useEffect(() => {
    if (target) router.replace(target);
  }, [target, router]);

  if (businesses.isError) {
    return (
      <PageError
        message={errorMessage(businesses.error)}
        onRetry={() => void businesses.refetch()}
      />
    );
  }
  return <PageLoading label="Abriendo tu barbería…" />;
}
