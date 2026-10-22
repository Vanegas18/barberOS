# ADR 0003: Bloques de agenda contra la doble reserva

- **Estado:** Aceptada (se implementa en la Fase 3)
- **Fecha:** 2026-10

## Contexto

Dos personas pueden reservar al mismo barbero a la misma hora casi al mismo tiempo: el dueño
desde el panel y un cliente desde la página pública. Validar "¿está libre?" y luego insertar
deja una ventana de carrera.

## Decisión

- Cada cita ocupa **bloques de tiempo** de tamaño fijo por empleado.
- Un **índice único** `(businessId, employeeId, inicioDelBloque)` hace que la base rechace la
  segunda reserva. La cita y sus bloques se crean en la misma transacción.
- Cancelar o mover una cita libera o reemplaza sus bloques en la misma transacción.
- Los horarios libres para reservas públicas se calculan en el servidor.

## Consecuencias

- La garantía la da la base, no la lógica de la aplicación.
- El tamaño del bloque limita la granularidad de horarios; se define con la Fase 3.
