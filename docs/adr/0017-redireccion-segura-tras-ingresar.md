# ADR 0017: Volver a la página de origen tras ingresar (?next=) de forma segura

- **Estado:** Aceptada
- **Fecha:** 2026-10

## Contexto

Quien abre un enlace privado (o una invitación) sin sesión debe volver ahí después de ingresar o
crear la cuenta. Un parámetro de redirección mal validado permite "open redirect": un enlace de
BarberOS que, tras iniciar sesión, lleva a un sitio falso.

## Decisión

- `proxy.ts` manda a `/ingresar?next=<ruta>` a quien entra sin sesión a una ruta privada.
- `/invitacion/<token>` es pública (además de `/{slug}/reservar`).
- **`safeNext()` solo acepta rutas internas**: deben empezar por `/` y no por `//` ni `/\`; si no,
  se usa `/inicio`. Lo usan el proxy y las páginas de ingreso y registro.
- Con sesión, `/ingresar?next=…` lleva directo al destino.

## Consecuencias

- El flujo de invitación funciona sin pasos extra.
- `?next=https://otro-sitio.com` termina en `/inicio`.
