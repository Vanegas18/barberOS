# ADR 0020: Sin cita y registro posterior

- **Estado:** Aceptada (se implementa en la Fase 3)
- **Fecha:** 2026-10

## Contexto

En la barbería muchos clientes llegan sin cita y a veces el barbero registra el servicio cuando
ya terminó. Hace falta que ambos casos tomen segundos, sin abrir la puerta a servicios inventados
que inflen las ganancias de la Fase 5.

## Decisión

- **Un solo botón "Sin cita"** con dos salidas: "Pasar a la silla" (`in_service`, empieza ahora,
  redondeado a 5 min) y "Ya fue atendido" (`completed`, con fecha y hora de inicio).
- Nombre por defecto "Cliente de paso" y celular opcional. **Sin celular no se crea ficha de
  cliente**: el nombre queda solo en la cita.
- En citas normales el cliente exige nombre y celular (o un cliente existente).
- El registro posterior **respeta el anti doble reserva** y queda marcado (`recordedAfter`) en el
  historial con quién lo hizo.
- **El barbero solo registra citas atendidas de hoy.** Días anteriores exigen el permiso nuevo
  `appointments:backdate` (owner y admin). Nunca se registra como atendida una cita que termina
  en el futuro.
- Fuera del horario, en el almuerzo o después de la salida habitual se permite agendar, pero la
  API devuelve avisos (`scheduleWarnings`).

## Consecuencias

- La lista de clientes no se llena de "Cliente de paso".
- El dueño puede auditar cada registro posterior.
