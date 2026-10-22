# ADR 0005: Aislamiento por negocio en dos barreras

- **Estado:** Aceptada
- **Fecha:** 2026-10

## Contexto

BarberOS es multiempresa sobre una sola base. Un error que deje ver los clientes o las ventas
de otra barbería sería grave para el producto y, con datos personales, también un problema
legal.

## Decisión

1. **`tenantContext`** en `/api/v1/businesses/:businessId/*`:
   - Valida el ObjectId y busca una membresía **activa en la base** (no confía en el token).
   - Sin membresía: **404**, nunca 403, para no revelar que el negocio existe.
   - Con membresía: si el negocio está suspendido o la prueba venció, 403
     `BUSINESS_SUSPENDED` o `TRIAL_EXPIRED` (la membresía se verifica primero).
   - Construye `req.tenant = { businessId, membershipId, role }`.
2. **`tenantPlugin`** en los modelos de negocio: rechaza consultas sin `businessId`. Saltarlo
   exige `skipTenantCheck` explícito y visible en la revisión de código.
3. Los módulos futuros se montan en `tenantRouter` y heredan la protección.
4. Permisos por rol con `requirePermission`, antes de validar el cuerpo (403 antes que 422).

## Consecuencias

- `tenancy.isolation.test.ts` prueba que un usuario no lee ni modifica otro negocio.
- `tenantPlugin` no cubre `insertMany` ni `bulkWrite`: si se usan, el `businessId` se pone a
  mano y se prueba.
- Una consulta extra por petición (membresía y negocio), aceptable a esta escala.
