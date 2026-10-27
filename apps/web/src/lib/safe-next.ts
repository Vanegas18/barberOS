const FALLBACK = "/inicio";

export function safeNext(value: string | string[] | undefined | null): string {
  const next = Array.isArray(value) ? value[0] : value;
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    return FALLBACK;
  }
  if (next === "/ingresar" || next === "/registro") return FALLBACK;
  return next;
}

export function withNext(path: string, next: string): string {
  return next === FALLBACK ? path : `${path}?next=${encodeURIComponent(next)}`;
}
