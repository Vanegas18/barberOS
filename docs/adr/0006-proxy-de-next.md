# ADR 0006: La web reenvía /api/* a la API (rewrites de Next)

- **Estado:** Aceptada
- **Fecha:** 2026-10

## Contexto

Las cookies `httpOnly` de sesión necesitan que la web y la API compartan origen. Si no, hay que
habilitar CORS con credenciales y lidiar con cookies de terceros, que los navegadores bloquean
cada vez más.

## Decisión

- `next.config.ts` define un rewrite `/api/:path*` → `${API_ORIGIN}/api/:path*`.
- El navegador solo habla con la web. La API conserva `cors` y `originCheck` como defensa.
- `API_ORIGIN` es obligatoria en producción: sin ella el build falla.

## Consecuencias

- Cookies de primera parte, sin CORS en el navegador.
- Un salto de red extra (web → API), aceptable.
- En producción la API ve la IP de la web: hay que configurar `trust proxy` y reenviar
  `X-Forwarded-For` para que el límite de peticiones funcione por cliente.
