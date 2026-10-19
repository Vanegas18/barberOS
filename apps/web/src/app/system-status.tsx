"use client";

import { useEffect, useState } from "react";

type Status = "checking" | "ok" | "degraded" | "down";

const VIEW: Record<Status, { text: string; className: string }> = {
  checking: { text: "Comprobando conexión con la API…", className: "bg-done-tint text-done" },
  ok: { text: "API y base de datos conectadas", className: "bg-live-tint text-live" },
  degraded: {
    text: "La API responde, pero la base de datos no",
    className: "bg-pending-tint text-pending",
  },
  down: { text: "No hay conexión con la API", className: "bg-pole-soft text-pole-ink" },
};

export function SystemStatus() {
  const [status, setStatus] = useState<Status>("checking");

  useEffect(() => {
    const controller = new AbortController();

    async function check() {
      try {
        const res = await fetch("/api/v1/health", {
          signal: controller.signal,
          cache: "no-store",
        });
        const body = (await res.json().catch(() => null)) as { status?: string } | null;

        if (res.ok && body?.status === "ok") setStatus("ok");
        else if (body?.status === "degraded") setStatus("degraded");
        else setStatus("down");
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setStatus("down");
      }
    }

    void check();
    return () => controller.abort();
  }, []);

  const { text, className } = VIEW[status];
  return (
    <p
      role="status"
      className={`inline-flex w-fit rounded-full px-3 py-1 text-sm font-medium ${className}`}
    >
      {text}
    </p>
  );
}
