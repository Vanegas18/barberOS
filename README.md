# BarberOS

Plataforma SaaS para administrar barberías: agenda, clientes, servicios, ventas, ganancias de
los barberos, gastos y caja. Sirve tanto a un barbero independiente como a un local con equipo.

Desarrollado por [Vanegas Solutions](https://www.vanegassolutions.com).

> **Estado:** Fase 1 terminada (base, autenticación, multiempresa, códigos de activación y
> panel). La agenda real llega en las Fases 2 y 3. Ver [plan de fases](#plan-de-fases).

## Qué resuelve

- **Orden:** agenda del día por barbero, citas de WhatsApp y clientes sin cita en un solo lugar.
- **Dinero claro:** ventas con pagos mixtos, ganancias por barbero y caja diaria cuadrada.
- **Cada barbería es distinta:** comisiones, medios de pago y reglas son configuración por
  negocio, nunca código fijo.
- **Celular primero:** todos los roles lo usan en el celular y en el computador.

## Stack

| Capa       | Tecnología                                                                                                            |
| ---------- | --------------------------------------------------------------------------------------------------------------------- |
| Monorepo   | pnpm workspaces                                                                                                       |
| API        | Node 22+, Express 5, TypeScript, Mongoose, Zod 4, argon2id, JWT en cookies httpOnly, helmet, express-rate-limit, pino |
| Web        | Next.js 16 (App Router, Turbopack), React 19, Tailwind CSS v4, shadcn/ui (Radix), TanStack Query, react-hook-form     |
| Compartido | `packages/contracts`: esquemas Zod, tipos, roles, permisos y códigos de error                                         |
| Pruebas    | Vitest, Supertest, mongodb-memory-server (replica set)                                                                |
| Datos      | MongoDB Atlas (replica set: transacciones)                                                                            |

## Estructura

```
barberos/
├── apps/
│   ├── api/          # API REST /api/v1 (monolito modular)
│   └── web/          # Panel en Next.js
├── packages/
│   ├── contracts/    # Fuente única de validación y tipos (API y web)
│   └── config/       # tsconfig compartidos
└── docs/
    ├── architecture.md
    ├── data-model.md
    └── adr/          # Decisiones de arquitectura
```

## Empezar

Requisitos: Node 22 o superior, pnpm 12 y una base MongoDB con replica set (Atlas M0 sirve).

```bash
pnpm install

# Variables de entorno
cp .env.example .env                          # API
cp apps/web/.env.example apps/web/.env.local  # Web
# Completa MONGODB_URI y JWT_ACCESS_SECRET en .env

pnpm dev   # API en :4000 y web en :3000
```

Abre http://localhost:3000, crea una cuenta y luego un negocio. Para crear un negocio hace
falta un código de activación (ver [ADR 0008](docs/adr/0008-codigos-de-activacion.md)):

```bash
pnpm --filter @barberos/api codes:create --label "Barbería de prueba" --trial-days 15
```

## Scripts

| Comando                                     | Qué hace                                |
| ------------------------------------------- | --------------------------------------- |
| `pnpm dev`                                  | API y web en paralelo                   |
| `pnpm -r run typecheck`                     | TypeScript en todos los paquetes        |
| `pnpm -r run test`                          | Todas las pruebas                       |
| `pnpm --filter @barberos/api test <filtro>` | Pruebas de la API que coinciden         |
| `pnpm lint`                                 | ESLint                                  |
| `pnpm format` / `pnpm format:check`         | Prettier                                |
| `pnpm --filter @barberos/web build`         | Build de producción de la web           |
| `pnpm --filter @barberos/api codes:create`  | Emite un código de activación (consola) |

> Con pnpm 12 los scripts recursivos necesitan `run`: `pnpm -r run test`, no `pnpm -r test`.

## Seguridad, en corto

- Contraseñas con argon2id. Sesión con JWT de acceso (15 min) y refresh rotativo (30 días)
  en cookies `httpOnly`, con detección de reutilización.
- Aislamiento por negocio en dos barreras: `tenantContext` (membresía activa en la base) y
  `tenantPlugin` (toda consulta exige `businessId`). Un negocio ajeno responde **404**.
- Permisos por rol verificados en la API. El frontend solo decide qué mostrar.
- helmet, verificación de `Origin`, límites de peticiones y tamaño de cuerpo.

Detalle en [docs/architecture.md](docs/architecture.md).

## Plan de fases

| Fase | Contenido                                                                     |
| ---- | ----------------------------------------------------------------------------- |
| 1 ✅ | Base, autenticación, multiempresa, códigos de activación, panel               |
| 2    | Equipo y catálogo: servicios, empleados, horarios, reglas de ganancia         |
| 3    | Agenda interna: clientes, citas, atención sin cita, anti doble reserva        |
| 4    | Reservas públicas `/{slug}/reservar` con QR, sin cuenta para el cliente final |
| 5    | Ventas, pagos mixtos, productos con dueño y ganancias                         |
| 6    | Caja diaria y gastos                                                          |
| 7    | Dashboard                                                                     |
| 8    | Recordatorios por WhatsApp, suscripciones y panel de plataforma               |

## Aviso

BarberOS es un sistema de control interno. **No emite factura electrónica (DIAN).**