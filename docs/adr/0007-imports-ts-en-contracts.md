# ADR 0007: Imports con extensión .ts en packages/contracts

- **Estado:** Aceptada
- **Fecha:** 2026-10

## Contexto

`contracts` se publica como TypeScript sin compilar y lo consumen la API (tsx, Node) y la web
(Turbopack con `transpilePackages`). Turbopack no resuelve un import `./roles.js` hacia
`roles.ts`.

## Decisión

- Dentro de `contracts`, los imports internos llevan extensión **`.ts`**.
- `allowImportingTsExtensions: true` en `contracts`, `api` (con `noEmit`) y `web`.
- La API conserva `.js` en sus propios imports internos.

## Consecuencias

- Un solo paquete de contratos, sin paso de build.
- Si algún día se compila `contracts`, habrá que reescribir extensiones
  (`rewriteRelativeImportExtensions`).
