# Modelo de datos

MongoDB con Mongoose. Convenciones:

- **Dinero en enteros** de la unidad mínima (COP: `30000` = $30.000) y **porcentajes en puntos
  base** (50 % = `5000`). Ver [ADR 0002](adr/0002-dinero-en-enteros.md).
- **Horas y duraciones en pasos de 5 minutos** ([ADR 0013](adr/0013-paso-de-agenda-de-5-minutos.md)).
  Horas como `"HH:mm"` y fechas de calendario como `"YYYY-MM-DD"`, ambas en la zona del negocio.
- Las colecciones de un negocio llevan `businessId` y usan `tenantPlugin`. Las de plataforma
  (usuarios, sesiones, negocios, códigos) no.
- Lo que se configura no se borra: se desactiva (`active: false`). Las operaciones financieras
  (fases futuras) usan transacción, `idempotencyKey` y copias de precios y reglas.

## Relaciones

```
User 1 ──── * Session
User 1 ──── * Membership * ──── 1 Business
ActivationCode 0..1 ──── 1 Business
Business 1 ──── * Service
Business 1 ──── * Employee 0..1 ──── 0..1 Membership   (un empleado puede no tener cuenta)
Employee 1 ──── * ScheduleException
Business 1 ──── * Invitation ──── 0..1 Employee
```

## Plataforma

### `users`

| Campo          | Tipo                   | Notas                      |
| -------------- | ---------------------- | -------------------------- |
| `name`         | string ≤ 80            |                            |
| `email`        | string ≤ 254           | Minúsculas. **Único.**     |
| `passwordHash` | string                 | argon2id. `select: false`. |
| `status`       | `active` \| `disabled` |                            |

### `sessions`

| Campo              | Tipo     | Notas                                            |
| ------------------ | -------- | ------------------------------------------------ |
| `userId`           | ObjectId | Índice.                                          |
| `refreshTokenHash` | string   | **Único.**                                       |
| `expiresAt`        | Date     | **Índice TTL:** MongoDB borra la sesión vencida. |
| `revokedAt`        | Date?    | Al rotar o cerrar sesión.                        |
| `userAgent`        | string?  | ≤ 300.                                           |

### `businesses` (el tenant)

| Campo         | Tipo                               | Notas                                                     |
| ------------- | ---------------------------------- | --------------------------------------------------------- |
| `name`        | string ≤ 80                        | Editable.                                                 |
| `slug`        | string ≤ 40                        | **Único. No se edita** (el QR impreso no puede romperse). |
| `currency`    | `COP` \| `USD` \| `MXN` \| `EUR`   | Por defecto COP. No se edita.                             |
| `timezone`    | IANA, ej. `America/Bogota`         | Editable.                                                 |
| `status`      | `trial` \| `active` \| `suspended` | Lo controla la plataforma.                                |
| `trialEndsAt` | Date \| null                       | La prueba vence sola por fecha.                           |

`access` (`ok | suspended | trial_expired`) no se guarda: se calcula y viaja en las respuestas.
El slug excluye palabras reservadas que chocan con rutas de la web (`ingresar`, `negocios`,
`invitacion`, etc.). Al implementar reservas públicas hay que añadir `reservar` y `r`.

### `activationcodes`

| Campo                                | Tipo             | Notas                                  |
| ------------------------------------ | ---------------- | -------------------------------------- |
| `codeHash`                           | string           | SHA-256. **Único.**                    |
| `label`                              | string ≤ 120     | Para quién se emitió.                  |
| `trialDays`                          | 0–365            | 0 = el negocio nace `active`.          |
| `expiresAt`                          | Date             |                                        |
| `usedAt`                             | Date \| null     | Se marca de forma atómica al consumir. |
| `usedByUserId` / `usedForBusinessId` | ObjectId \| null |                                        |

## Por negocio

### `memberships` (acceso y rol)

| Campo        | Tipo                                 | Notas                    |
| ------------ | ------------------------------------ | ------------------------ |
| `businessId` | ObjectId                             | `tenantPlugin`.          |
| `userId`     | ObjectId                             |                          |
| `role`       | `owner` \| `admin` \| `barber`       | Roles fijos.             |
| `status`     | `active` \| `invited` \| `suspended` | Solo `active` da acceso. |

Índice **único** `(businessId, userId)`.

### `services`

| Campo             | Tipo                 | Notas                                        |
| ----------------- | -------------------- | -------------------------------------------- |
| `name`            | string ≤ 60          |                                              |
| `nameKey`         | string               | Sin tildes ni mayúsculas. Único por negocio. |
| `description`     | string ≤ 300 \| null |                                              |
| `price`           | entero 0–100.000.000 |                                              |
| `durationMinutes` | 5–480, múltiplo de 5 |                                              |
| `visibleOnline`   | boolean              | Aparece en la página pública (Fase 4).       |
| `active`          | boolean              | Desactivado: no se ofrece en citas nuevas.   |

Índice **único** `(businessId, nameKey)`, también contra inactivos (se reactiva, no se duplica).

### `employees` (quien atiende)

| Campo                   | Tipo                        | Notas                                                                                           |
| ----------------------- | --------------------------- | ----------------------------------------------------------------------------------------------- |
| `displayName`           | string ≤ 40                 | Como aparece en la agenda.                                                                      |
| `nameKey`               | string                      | Único por negocio.                                                                              |
| `phone`                 | E.164 \| null               | `normalizePhone` (sin "+", asume Colombia).                                                     |
| `membershipId`          | ObjectId \| null            | Cuenta vinculada. Puede no tener.                                                               |
| `earningRule`           | ver abajo                   | Solo la fija el owner ([ADR 0015](adr/0015-regla-de-ganancia-y-permiso-earnings-configure.md)). |
| `acceptsOnlineBookings` | boolean                     |                                                                                                 |
| `active`                | boolean                     |                                                                                                 |
| `weeklySchedule`        | 7 días: `Workday` \| `null` | [ADR 0014](adr/0014-horario-con-salida-habitual-y-dias-especiales.md).                          |

- `earningRule`: `{ type: "percentage", rateBp }` | `{ type: "fixed", amount }` | `{ type: "none" }`.
- `Workday`: `{ start: "HH:mm", end: "HH:mm", lunch: { start, durationMinutes } | null }`.
  `end` es la salida habitual.
- Índices **únicos** `(businessId, nameKey)` y `(businessId, membershipId)` parcial (solo cuando hay
  cuenta).
- **Membresía ≠ empleado:** la membresía es acceso y rol; el empleado es quien atiende, tiene
  horario y gana. Todos los empleados atienden todos los servicios.

### `scheduleexceptions` (días especiales)

| Campo        | Tipo                 | Notas                        |
| ------------ | -------------------- | ---------------------------- |
| `employeeId` | ObjectId             |                              |
| `date`       | `"YYYY-MM-DD"`       |                              |
| `workday`    | `Workday` \| null    | `null` = no trabaja ese día. |
| `note`       | string ≤ 120 \| null |                              |

Índice **único** `(businessId, employeeId, date)`. Se borra físicamente: es configuración.

### `invitations`

| Campo                             | Tipo                                 | Notas                         |
| --------------------------------- | ------------------------------------ | ----------------------------- |
| `role`                            | `admin` \| `barber`                  |                               |
| `employeeId`                      | ObjectId \| null                     | Obligatorio para `barber`.    |
| `tokenHash`                       | string                               | SHA-256 del token. **Único.** |
| `status`                          | `pending` \| `accepted` \| `revoked` |                               |
| `expiresAt`                       | Date                                 | 7 días.                       |
| `createdByMembershipId`           | ObjectId                             |                               |
| `acceptedAt` / `acceptedByUserId` | Date / ObjectId \| null              |                               |

No se borran: quedan como registro ([ADR 0016](adr/0016-invitaciones-por-enlace.md)).

## Roles y permisos

Definidos en `contracts/permissions.ts`.

| Rol      | Alcance                                                                                                |
| -------- | ------------------------------------------------------------------------------------------------------ |
| `owner`  | Todo, incluido `earnings:configure` y `members:manage` (invitar admins).                               |
| `admin`  | Opera el negocio: equipo, horarios, servicios, invitar barberos. No edita el negocio ni las ganancias. |
| `barber` | Ve su ficha, su horario y los servicios activos.                                                       |

## Próximas colecciones (diseño acordado)

| Fase | Colección                              | Puntos clave                                                                                                                                                                             |
| ---- | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 3    | `customers`                            | Celular E.164 **único por negocio**.                                                                                                                                                     |
| 3    | `appointments`                         | `source: internal \| walk_in \| public`; estados `pending → in_service → completed`, más `cancelled` / `no_show` ([ADR 0019](adr/0019-citas-con-tres-estados.md)); historial de cambios. |
| 3    | bloques de agenda                      | Casillas de 5 min con índice único ([ADR 0003](adr/0003-bloques-de-agenda.md)).                                                                                                          |
| 5    | `sales`, `earnings`                    | Pagos mixtos; copia de precio y regla al vender.                                                                                                                                         |
| 5    | `products`, movimientos, liquidaciones | **Opcional por negocio.** Producto con dueño (negocio o empleado); entradas, ventas y conteos; liquidación al dueño (100 % de lo suyo).                                                  |
| 6    | `cash_sessions`, `expenses`            | La caja solo cuadra efectivo.                                                                                                                                                            |
