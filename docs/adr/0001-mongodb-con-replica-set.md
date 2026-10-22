# ADR 0001: MongoDB con replica set y transacciones

- **Estado:** Aceptada
- **Fecha:** 2026-10

## Contexto

Crear un negocio escribe varios documentos que deben existir juntos o no existir: el negocio,
la membresía del dueño y el consumo del código de activación. Las fases de ventas y caja harán
lo mismo con dinero. MongoDB solo ofrece transacciones multi-documento sobre un replica set.

## Decisión

- MongoDB (Atlas) con Mongoose, siempre sobre **replica set**. Atlas lo es incluso en M0.
- Las operaciones compuestas usan `withTransaction` (`shared/db/transaction.ts`). Toda escritura
  dentro recibe `{ session }`.
- Dentro de una transacción **no hay efectos externos** (correos, WhatsApp): MongoDB puede
  reintentar la función.
- Las pruebas usan `MongoMemoryReplSet`, no un servidor suelto, para ejercitar transacciones
  reales.

## Consecuencias

- Rollback demostrado por pruebas (`business.transaction.test.ts`).
- Sin Docker en desarrollo: se usa Atlas `barberos-dev`.
- M0 no tiene backups: antes de producción hay que pasar a Flex/M10 o montar backups propios.
