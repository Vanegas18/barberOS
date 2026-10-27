# ADR 0009: Reservas públicas sin cuenta para el cliente final

- **Estado:** Aceptada (se implementa en la Fase 4)
- **Fecha:** 2026-10

## Contexto

Las barberías quieren que sus clientes reserven solos desde un enlace o un QR. Pedir una cuenta
al cliente final mata la conversión y obliga a otro sistema de autenticación.

## Decisión

- El cliente se identifica con **nombre y celular** (E.164, único por negocio). Si vuelve, se
  reconoce.
- Cada cita pública trae un **enlace secreto** (token) para cancelar o reprogramar.
- Las citas públicas nacen **por confirmar** (`pending`), salvo que el negocio active la
  confirmación automática.
- Anti-abuso: captcha invisible (Cloudflare Turnstile), límite de peticiones y máximo de citas
  activas por celular. OTP por WhatsApp más adelante.
- Rutas `/api/v1/public/{slug}/...` **fuera de `tenantContext`**, con lista blanca de datos:
  servicios, barberos (nombre y foto) y horarios libres calculados en el servidor.
- QR en SVG hacia `/{slug}/reservar?src=qr`. El slug no se edita, así que el QR impreso no se
  rompe.
- Casilla obligatoria de autorización de tratamiento de datos (Ley 1581 de 2012).

## Consecuencias

- Hay que reservar los slugs `reservar` y `r`.
- Las Fases 2 y 3 ya modelan `visibleOnline`, `acceptsOnlineBookings`, `source` y `pending`.
- La política de datos debe cubrir a los clientes finales antes de abrir la Fase 4.
