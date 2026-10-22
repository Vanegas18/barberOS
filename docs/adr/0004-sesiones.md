# ADR 0004: Sesiones con JWT de acceso corto y refresh rotativo en cookies

- **Estado:** Aceptada
- **Fecha:** 2026-10

## Contexto

La web necesita sesiones largas (un barbero no quiere iniciar sesión cada día) sin exponer
tokens a JavaScript (XSS) y con forma de cortar una sesión robada.

## Decisión

- **Acceso:** JWT firmado (15 min) en la cookie `bo_access`, `path=/`.
- **Refresh:** token opaco aleatorio (30 días) en la cookie `bo_refresh`, `path=/api/v1/auth`
  (solo viaja a auth). En la base solo se guarda su hash, en `sessions`, con índice TTL.
- **Rotación:** cada refresh revoca la sesión usada y emite una nueva. El consumo es atómico:
  si dos refresh llegan a la vez, solo uno gana.
- **Detección de reutilización:** si llega un refresh ya rotado, se revocan todas las sesiones
  del usuario.
- Cookies `httpOnly`, `SameSite=Lax`, `Secure` en producción. Contraseñas con argon2id.
- En la web, el refresh se serializa (promesa compartida en la pestaña y Web Locks entre
  pestañas) para no disparar falsas reutilizaciones.

## Consecuencias

- Ningún token es legible desde JavaScript.
- Un acceso revocado sigue vivo hasta 15 minutos; la membresía, en cambio, se verifica en la
  base en cada petición ([ADR 0005](0005-aislamiento-por-negocio.md)).
- La web necesita saber si hay sesión sin leer tokens: ver
  [ADR 0010](0010-proteccion-de-rutas-en-la-web.md).
