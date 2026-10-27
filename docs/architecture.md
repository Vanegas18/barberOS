# Arquitectura

Vista general de cómo está construido BarberOS. Las razones de cada decisión están en
[`docs/adr/`](adr/).

## Panorama

```
Navegador ──► Web (Next.js, :3000) ──rewrites /api/*──► API (Express, :4000) ──► MongoDB
               proxy.ts: redirige según              authenticate → tenantContext
               la cookie bo_session                  → requirePermission → servicio
```

- El navegador **solo habla con la web**. Next reenvía `/api/*` a la API, así que las cookies
  son del mismo origen y no hace falta CORS en el navegador ([ADR 0006](adr/0006-proxy-de-next.md)).
- La API es la **única autoridad**: autentica, aísla por negocio y verifica permisos. La web
  decide qué mostrar, nunca qué se permite.
- `packages/contracts` es la fuente única de esquemas Zod, tipos, roles, permisos y códigos
  de error. La API valida con ellos y los formularios de la web también.

## API (`apps/api`)

**Monolito modular.** Cada módulo vive en `src/modules/<dominio>/` con modelo, servicio,
controlador y rutas. **Un módulo solo usa el servicio público de otro, nunca su modelo.**
Ejemplo: solo `memberships/membership.service.ts` toca `MembershipModel`.

```
src/
├── app.ts              # composición: middlewares globales y montaje de rutas
├── server.ts           # arranque y conexión a la base
├── config/env.ts       # variables de entorno validadas con Zod (falla al arrancar si faltan)
├── shared/
│   ├── db/             # conexión, tenantPlugin, withTransaction
│   ├── errors/         # AppError
│   ├── middleware/     # validate, requirePermission, rate limits, origin, errores
│   └── money/          # enteros y puntos base
└── modules/
    ├── auth/           # usuarios, sesiones, tokens, cookies
    ├── businesses/     # negocios, slug
    ├── memberships/    # membresías y tenantContext
    ├── activation-codes/
    ├── services/       # catálogo de servicios
    ├── employees/      # empleados, regla de ganancia, semana tipo
    ├── schedules/      # días especiales por empleado
    └── invitations/    # enlaces de invitación de un solo uso
```

### Orden de una petición

1. `requestId`, `pino-http`, `helmet`, `cors`, límite global, `originCheck`, `express.json`
   (100 kB), `cookie-parser`.
2. Límites específicos: login y registro (10 / 15 min), creación de negocio (10 / 15 min).
3. Rutas públicas de auth (`/api/v1/auth/*`) y de cuenta (`/api/v1/me/*`, `POST /businesses`).
4. **Rutas de un negocio:** `/api/v1/businesses/:businessId/*` pasan por
   `authenticate → tenantContext → tenantRouter`. Todo módulo nuevo se cuelga de `tenantRouter`
   y hereda la protección.
5. Dentro de la ruta: `requirePermission` **antes** de `validate` (403 antes que 422), luego
   el servicio.
6. `notFoundHandler` y `errorHandler`: respuesta uniforme
   `{ error: { code, message, details?, requestId } }`.

### Aislamiento por negocio (dos barreras)

1. **`tenantContext`:** valida el `businessId`, busca una membresía **activa en la base** (no
   confía en el token) y arma `req.tenant = { businessId, membershipId, role }`. Sin membresía
   responde **404**, nunca 403, para no revelar que el negocio existe. Con membresía, si el
   negocio está suspendido o su prueba venció, responde 403 `BUSINESS_SUSPENDED` o
   `TRIAL_EXPIRED`.
2. **`tenantPlugin`:** los modelos de un negocio exigen `businessId` en cada consulta. Saltarlo
   requiere `skipTenantCheck` explícito. No cubre `insertMany` ni `bulkWrite`.

`tenancy.isolation.test.ts` demuestra que un usuario no puede leer ni modificar otro negocio.
Ver [ADR 0005](adr/0005-aislamiento-por-negocio.md).

### Sesiones

| Cookie       | Contenido                 | Path           | Vida                          |
| ------------ | ------------------------- | -------------- | ----------------------------- |
| `bo_access`  | JWT de acceso             | `/`            | 15 min                        |
| `bo_refresh` | Token de refresh opaco    | `/api/v1/auth` | 30 días                       |
| `bo_session` | `"1"` (solo un indicador) | `/`            | La del refresh, para el proxy |

Todas son `httpOnly`, `SameSite=Lax` y `Secure` en producción. El refresh rota en cada uso; si
llega un refresh ya rotado, se revocan **todas** las sesiones del usuario. Ver
[ADR 0004](adr/0004-sesiones.md) y [ADR 0010](adr/0010-proteccion-de-rutas-en-la-web.md).

## Web (`apps/web`)

```
src/
├── proxy.ts            # protección de rutas por cookie (Next 16 reemplaza middleware.ts)
├── app/                # solo compone rutas; sin lógica de negocio
│   ├── (auth)/         # /ingresar, /registro
│   ├── (cuenta)/       # /inicio, /negocios, /negocios/nuevo
│   ├── [businessSlug]/ # panel: agenda, equipo, ajustes/servicios, /mas
│   ├── invitacion/     # /invitacion/[token], pública
│   ├── not-found.tsx
│   └── providers.tsx   # TanStack Query y reacciones globales a 401/403
├── features/<dominio>/ # api.ts, hooks.ts y componentes de cada dominio
├── components/         # ui/ (shadcn), brand/, forms/, feedback/
├── config/             # configuración pública (soporte)
├── lib/api/            # cliente HTTP, errores, refresh serializado
└── lib/safe-next.ts    # valida ?next= (solo rutas internas)
```

- **Rutas en español.** `app/` solo compone; la lógica vive en `features/`.
- **Cliente de API:** `api<T>()` lanza `ApiError` (status 0 = sin red). Ante un 401 intenta un
  refresh **serializado**: una promesa compartida en la pestaña y Web Locks entre pestañas.
- **TanStack Query:** no reintenta 4xx. Un 401 en una consulta lleva a `/ingresar`. Un 403
  `BUSINESS_SUSPENDED`/`TRIAL_EXPIRED` recarga "mis negocios" y el panel muestra el bloqueo.
- **Panel:** el slug se resuelve contra `GET /me/businesses`. Slug ajeno → 404 propio. Menú
  filtrado por rol (sidebar en escritorio, barra inferior con "Más" en móvil).
- **Sin Cache Components:** el panel es privado y dinámico.
- **Diseño:** tema claro, paleta cerrada en Tailwind v4. Ver [ADR 0012](adr/0012-sistema-de-diseno.md).

## Pruebas

- **API:** Vitest + Supertest contra MongoDB en memoria con replica set (las transacciones lo
  exigen). Pruebas de flujo por módulo, aislamiento entre negocios, rollback de transacciones
  y concurrencia (dos usos de un mismo código: solo uno gana).
- **Web:** pruebas unitarias del cliente de API, contraste de colores y variantes de botón.
- Cada cambio relevante incluye **pruebas de protección**: romper la regla a propósito,
  comprobar que una prueba falla y revertir.

## Pendiente antes de producción (Fase 3)

Entornos separados, backups de Atlas (M0 no los tiene), recuperación de contraseña por correo,
monitoreo de errores, hosting de la API con `trust proxy`, dominio, política de datos (Ley 1581)
y términos de servicio. El límite de peticiones vive en memoria: vale con una sola instancia.
