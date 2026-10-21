"use client";

import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { personInitials } from "@/features/businesses/labels";
import { useLogout, useMe } from "./hooks";

export function AccountBar() {
  const me = useMe();
  const logout = useLogout();

  return (
    <div className="flex items-center gap-2">
      {me.data && (
        <span className="flex items-center gap-2.5">
          <span className="hidden text-sm font-semibold sm:inline">{me.data.name}</span>
          <span
            aria-hidden="true"
            className="flex size-9 items-center justify-center rounded-full bg-ink text-xs font-bold text-brand"
          >
            {personInitials(me.data.name)}
          </span>
        </span>
      )}
      <Button
        variant="ghost"
        className="px-3 hover:bg-brand-hover"
        disabled={logout.isPending}
        onClick={() => logout.mutate()}
        aria-label="Cerrar sesión"
      >
        <LogOut aria-hidden="true" />
        <span className="hidden sm:inline">
          {logout.isPending ? "Cerrando sesión…" : "Cerrar sesión"}
        </span>
      </Button>
    </div>
  );
}
