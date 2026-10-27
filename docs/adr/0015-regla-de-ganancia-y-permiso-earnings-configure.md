# ADR 0015: Regla de ganancia por empleado y permiso earnings:configure

- **Estado:** Aceptada
- **Fecha:** 2026-10

## Contexto

Cada barbero gana distinto: un porcentaje de cada servicio, un monto fijo o nada (el dueño se
queda con todo). Es dinero: el admin gestiona el equipo, pero no debería poder subirse ni subirle
la comisión a nadie.

## Decisión

- Regla por empleado: `percentage` (puntos base, 50 % = `5000`) | `fixed` (monto entero por
  servicio) | `none`. Solo se guarda el dato del tipo elegido.
- **Permiso nuevo `earnings:configure`, solo del owner.** El admin crea y edita empleados, pero si
  envía `earningRule` recibe 403. Un empleado creado por el admin queda en `none` hasta que el
  dueño defina su regla.
- La web solo muestra la regla y su formulario a quien tiene el permiso.
- Cambiar la regla no altera ventas pasadas: cada venta guardará su copia (Fase 5).
- Productos de un barbero: el 100 % de su venta es para ese barbero (decisión del piloto).

## Consecuencias

- La regla es configuración por negocio, nunca código fijo.
- La Fase 5 renombra `commissions:*` → `earnings:*` y reutiliza este permiso.
