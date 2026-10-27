# ADR 0016: Invitaciones por enlace de un solo uso

- **Estado:** Aceptada
- **Fecha:** 2026-10

## Contexto

Los barberos y el admin necesitan su propia cuenta para ver la agenda en el celular, sin que el
dueño comparta su contraseña. En la barbería todo se comunica por WhatsApp.

## Decisión

- El dueño crea al empleado en Equipo (con horario y regla) y luego genera un **enlace
  `/invitacion/<token>`** para enviarlo por WhatsApp.
- **Un solo uso y vence a los 7 días.** El token tiene 32 bytes aleatorios; solo se guarda su
  hash SHA-256 y el enlace se muestra una vez.
- Owner y admin invitan barberos; **solo el owner** invita y anula invitaciones de admin.
- Invitación de barbero: siempre ligada a un empleado activo y sin cuenta. De admin: empleado
  opcional.
- **Aceptar es una transacción**: marca la invitación usada, crea la membresía y vincula el
  empleado. Si ya es miembro o el empleado ya tiene cuenta, 409 y no queda nada a medias.
- El mismo error (`INVITATION_INVALID`, 404) para inexistente, usada, vencida o anulada.
- La página de invitación es pública; para aceptar hay que tener sesión. Crear cuenta o ingresar
  devuelve a la invitación ([ADR 0017](0017-redireccion-segura-tras-ingresar.md)).

## Consecuencias

- El empleado ya está listo (horario, regla) cuando entra por primera vez.
- Un enlace filtrado no sirve si ya se usó, y la base nunca guarda tokens en claro.
