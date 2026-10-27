# ADR 0014: Horario con salida habitual y días especiales

- **Estado:** Aceptada
- **Fecha:** 2026-10

## Contexto

En el piloto la hora de entrada es fija, pero la salida no: en quincena o días llenos se quedan
más tarde y otros días salen antes. El almuerzo dura entre 1 h 30 y 2 h. Un horario rígido de
entrada y salida no refleja cómo trabajan.

## Decisión

- **Semana tipo dentro del empleado** (`weeklySchedule`): siete días; `null` = descansa. Cada día:
  `start`, `end` y `lunch` (`{ start, durationMinutes }` o `null`).
- **`end` es la salida habitual**: limita solo las **reservas por internet**. En la agenda
  interna el equipo puede agendar después de esa hora.
- **Días especiales** en su propia colección (`scheduleexceptions`): uno por empleado y fecha,
  "no trabaja" u "otro horario", con nota. `PUT` crea o reemplaza (idempotente); `DELETE` devuelve
  el día a la semana tipo.
- `resolveWorkday(semana, excepción, fecha)` en `contracts` calcula el horario real de un día.
- Horario base al crear un empleado: lunes a sábado de 9:00 a 19:00, almuerzo 13:00 por 90 min,
  domingo libre.
- Sin horario general del negocio por ahora: la agenda sale del horario de cada barbero.

## Consecuencias

- La configuración es simple (una semana) y los casos reales caben en días especiales.
- La agenda (Fase 3) y las reservas (Fase 4) usan la misma función para saber si alguien trabaja.
