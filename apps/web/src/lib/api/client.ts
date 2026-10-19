const BASE = "/api/v1";

/** Rutas de auth que nunca disparan un refresh (evita bucles y errores engañosos). */
const NO_REFRESH = new Set(["/auth/login", "/auth/register", "/auth/refresh", "/auth/logout"]);

interface ApiErrorBody {
  error?: { code?: string; message?: string; details?: unknown; requestId?: string };
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
    readonly requestId?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  signal?: AbortSignal;
}

async function send(path: string, { method = "GET", body, signal }: RequestOptions) {
  try {
    return await fetch(`${BASE}${path}`, {
      method,
      signal,
      cache: "no-store",
      headers:
        body === undefined
          ? { Accept: "application/json" }
          : { Accept: "application/json", "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    throw new ApiError(0, "NETWORK_ERROR", "No hay conexión con el servidor");
  }
}

async function parse<T>(res: Response): Promise<T> {
  if (res.status === 204) return undefined as T;
  const data: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const err = (data as ApiErrorBody | null)?.error;
    throw new ApiError(
      res.status,
      err?.code ?? "UNKNOWN_ERROR",
      err?.message ?? "No se pudo completar la solicitud",
      err?.details,
      err?.requestId,
    );
  }
  return data as T;
}

async function runRefresh(): Promise<boolean> {
  const call = async () => (await fetch(`${BASE}/auth/refresh`, { method: "POST" })).ok;
  // Web Locks: un solo refresh a la vez también ENTRE PESTAÑAS. Dos refresh simultáneos
  // usarían el mismo token y la API lo trataría como robo, cerrando todas las sesiones.
  if (typeof navigator !== "undefined" && "locks" in navigator && navigator.locks) {
    return navigator.locks.request("barberos-auth-refresh", call);
  }
  return call();
}

let refreshing: Promise<boolean> | null = null;

/** Todas las peticiones que reciben 401 a la vez comparten UN solo refresh. */
function refreshSession(): Promise<boolean> {
  refreshing ??= runRefresh()
    .catch(() => false)
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const res = await send(path, options);
  if (res.status === 401 && !NO_REFRESH.has(path) && (await refreshSession())) {
    return parse<T>(await send(path, options));
  }
  return parse<T>(res);
}

/** Mensaje listo para mostrar al usuario. `byStatus` permite textos según el contexto. */
export function errorMessage(err: unknown, byStatus: Partial<Record<number, string>> = {}) {
  if (err instanceof ApiError) {
    const custom = byStatus[err.status];
    if (custom) return custom;
    if (err.status === 0) return "No hay conexión con el servidor. Revisa tu internet.";
    if (err.status === 429) return "Demasiados intentos. Espera unos minutos e inténtalo de nuevo.";
    if (err.status >= 500) return "Algo falló de nuestro lado. Inténtalo de nuevo en un momento.";
    return err.message;
  }
  return "Ocurrió un error inesperado. Inténtalo de nuevo.";
}
