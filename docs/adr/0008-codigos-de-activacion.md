# ADR 0008: Crear un negocio exige un código de activación

- **Estado:** Aceptada
- **Fecha:** 2026-10

## Contexto

Con registro abierto, cualquiera podía crear barberías gratis sin control de Vanegas Solutions,
y aún no hay pasarela de pago.

## Decisión

- **Crear cuenta es abierto; crear un negocio exige un código** `BRB-XXXX-XXXX-XXXX` (base32 de
  Crockford, 60 bits). Se aceptan minúsculas, espacios y la falta de guiones; se corrige O→0 e
  I/L→1.
- Un solo uso, con vencimiento y días de prueba opcionales. Se guarda solo el **hash SHA-256**,
  suficiente por la alta entropía.
- El consumo es **atómico** (`findOneAndUpdate` con `usedAt: null`) y ocurre en la misma
  transacción que crea el negocio.
- Código inválido, usado o vencido → el mismo **422 `INVALID_ACTIVATION_CODE`**, para no dar
  pistas. Límite de 10 intentos cada 15 minutos.
- El negocio tiene `status: trial | active | suspended`; la prueba vence sola por fecha.
- Emisión por consola:
  `pnpm --filter @barberos/api codes:create --label "..." [--trial-days N] [--expires-in-days N]`.
- El rol de plataforma (Vanegas Solutions) no es un rol dentro de los negocios.

## Consecuencias

- Control comercial desde el primer día, y suspensión por falta de pago sin borrar datos.
- Futuro: prueba gratis y suscripción con pasarela (Wompi o Mercado Pago) y panel de plataforma
  en lugar del script.
