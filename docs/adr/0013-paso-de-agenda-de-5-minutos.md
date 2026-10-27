# ADR 0013: La agenda trabaja en pasos de 5 minutos

- **Estado:** Aceptada
- **Fecha:** 2026-10

## Contexto

Cada servicio tiene una duración y cada barbero un horario. La agenda necesita una unidad común
para ubicar citas sin huecos raros (9:07–9:39) y para impedir la doble reserva
([ADR 0003](0003-bloques-de-agenda.md)).

## Decisión

- **Toda hora y toda duración van en múltiplos de 5 minutos.**
- Servicios: duración de 5 a 480 minutos. Horarios: horas `HH:mm` en pasos de 5. Almuerzo: 15 a
  180 minutos en pasos de 5.
- Las constantes viven en `contracts` (`SERVICE_DURATION_STEP_MINUTES`, `SCHEDULE_STEP_MINUTES`).
- El paso es la precisión **interna**. La página pública de reservas podrá ofrecer horas cada 15
  o 30 minutos, configurable por negocio.

## Consecuencias

- Cada barbero tiene casillas de 5 minutos por día; una cita ocupa las suyas y un índice único
  impide que dos citas compartan casilla.
- Un servicio de 20 o 25 minutos se representa tal cual, sin perder tiempo de silla.
