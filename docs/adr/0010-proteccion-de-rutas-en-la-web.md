# ADR 0010: Protección de rutas en la web con proxy.ts y la cookie bo_session

- **Estado:** Aceptada
- **Fecha:** 2026-10

## Contexto

La web debe redirigir antes de pintar: sin sesión, el panel va a `/ingresar`; con sesión,
`/ingresar` va a `/inicio`. En Next 16, `middleware.ts` se reemplazó por **`proxy.ts`**. El
proxy ve las cookies, pero `bo_refresh` tiene `path=/api/v1/auth` (no llega a las páginas) y
`bo_access` vence a los 15 minutos aunque la sesión siga viva.

## Decisión

- La API emite una tercera cookie, **`bo_session=1`**: `httpOnly`, `path=/` y la misma vida que
  el refresh. No contiene secretos; solo indica que hay sesión.
- Se borra al cerrar sesión y también cuando llega un refresh sin token, para evitar bucles de
  redirección con una cookie huérfana.
- `src/proxy.ts`:
  - Sin `bo_session` en una ruta privada → `/ingresar`.
  - Con `bo_session` en `/ingresar` o `/registro` → `/inicio`.
  - Ruta pública: `/{slug}/reservar` (Fase 4). Excluye `/api`, estáticos y archivos.
- El proxy **no autoriza**: solo evita pantallas vacías. La API sigue siendo la autoridad; si la
  sesión ya no sirve, un 401 en una consulta lleva a `/ingresar`.

## Consecuencias

- Redirección sin parpadeo y sin verificar JWT en la web (no se comparte el secreto).
- Una cookie `bo_session` falsificada solo muestra la carcasa vacía: la API responde 401.
