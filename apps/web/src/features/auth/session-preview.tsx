"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ApiError, errorMessage } from "@/lib/api/client";
import { FormAlert } from "@/components/forms/form-alert";
import { useLogout, useMe } from "./hooks";

export function SessionPreview() {
  const router = useRouter();
  const me = useMe();
  const logout = useLogout();
  const isUnauthorized = me.error instanceof ApiError && me.error.status === 401;

  useEffect(() => {
    if (isUnauthorized) router.replace("/ingresar");
  }, [isUnauthorized, router]);

  if (me.isPending || isUnauthorized) {
    return (
      <p role="status" className="text-sm text-ink-muted">
        Cargando tu sesión…
      </p>
    );
  }

  if (me.isError) return <FormAlert message={errorMessage(me.error)} />;

  return (
    <section className="flex flex-col gap-5 rounded-2xl border border-line bg-surface p-6">
      <div className="flex flex-col gap-1">
        <p className="text-sm text-ink-muted">Sesión iniciada como</p>
        <p className="text-xl font-semibold">{me.data.name}</p>
        <p className="text-sm text-ink-muted">{me.data.email}</p>
      </div>
      <Button
        variant="outline"
        className="h-11"
        disabled={logout.isPending}
        onClick={() => logout.mutate()}
      >
        {logout.isPending ? "Cerrando sesión…" : "Cerrar sesión"}
      </Button>
    </section>
  );
}
