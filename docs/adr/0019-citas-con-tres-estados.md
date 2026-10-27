# ADR 0019: Citas con tres estados y permisos por rol

- **Estado:** Aceptada (se implementa en la Fase 3)
- **Fecha:** 2026-10

## Contexto

En la barbería no hay tiempo para flujos largos. El piloto pidió lo mínimo: la cita existe, el
cliente llegó, se terminó. Además, el WhatsApp del cliente muchas veces le llega al barbero, no al
admin.

## Decisión

- **Tres estados:** Pendiente → En silla → Atendida.
  - Pendiente: la registró el equipo desde un WhatsApp o la creó el cliente por el QR.
  - En silla: un botón "¿Llegó el cliente?".
  - Atendida: un botón al terminar.
- **Acción secundaria "No vino / Cancelar"** en un menú (no es un paso del flujo): libera el espacio
  y guarda el motivo (`no_show` o `cancelled`). Sin ella, una cita sin cliente bloquearía la silla.
- "Atender sin cita" crea la cita directamente en "En silla".
- **Permisos:** owner y admin crean y cambian cualquier cita. El barbero crea citas para sí mismo y
  cambia o cancela solo las suyas (permiso nuevo tipo `appointments:manage_own`).
- **Historial de cambios** (quién, cuándo, de qué a qué) y **deshacer** el último cambio por unos
  minutos. Una cita con venta registrada (Fase 5) ya no la modifica el barbero.

## Consecuencias

- `APPOINTMENT_STATUSES` en `contracts` se ajusta en la Fase 3 (se elimina `confirmed`).
- El dueño puede revisar cualquier cambio sin frenar al barbero en el día a día.
