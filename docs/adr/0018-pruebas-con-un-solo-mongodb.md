# ADR 0018: Pruebas de la API con un solo MongoDB en memoria

- **Estado:** Aceptada
- **Fecha:** 2026-10

## Contexto

Cada archivo de pruebas levantaba su propio replica set en memoria. Con 11 archivos la suite se
volvía lenta y cada módulo nuevo la empeoraba.

## Decisión

- `globalSetup` de Vitest levanta **un** replica set y comparte su URI (`provide` / `inject`).
- `useTestDatabase()` conecta cada archivo a **una base propia** con nombre aleatorio, crea
  índices de los modelos importados y la borra al terminar. Los archivos siguen en paralelo.
- `tests/actors.ts` reúne ayudas comunes (`signUp`, `createBusinessAs`, `joinAs`, `api`).

## Consecuencias

- La suite bajó a unos 32 segundos.
- Los índices únicos se crean de forma explícita: las pruebas que dependen de ellos son confiables.
