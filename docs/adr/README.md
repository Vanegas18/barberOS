# Decisiones de arquitectura (ADR)

Cada ADR registra una decisión con su contexto y sus consecuencias. Una decisión no se
edita para cambiarla: se escribe un ADR nuevo que la reemplaza y el anterior se marca
como "Reemplazada por NNNN".

| ADR                                           | Decisión                                                                     | Estado                                |
| --------------------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------- |
| [0001](0001-mongodb-con-replica-set.md)       | MongoDB con replica set y transacciones                                      | Aceptada                              |
| [0002](0002-dinero-en-enteros.md)             | Dinero en enteros y porcentajes en puntos base                               | Aceptada                              |
| [0003](0003-bloques-de-agenda.md)             | Bloques de agenda contra la doble reserva                                    | Aceptada (se implementa en la Fase 3) |
| [0004](0004-sesiones.md)                      | Sesiones con JWT de acceso corto y refresh rotativo en cookies               | Aceptada                              |
| [0005](0005-aislamiento-por-negocio.md)       | Aislamiento por negocio en dos barreras                                      | Aceptada                              |
| [0006](0006-proxy-de-next.md)                 | La web reenvía /api/* a la API (rewrites de Next)                            | Aceptada                              |
| [0007](0007-imports-ts-en-contracts.md)       | Imports con extensión .ts en packages/contracts                              | Aceptada                              |
| [0008](0008-codigos-de-activacion.md)         | Crear un negocio exige un código de activación                               | Aceptada                              |
| [0009](0009-reservas-publicas-sin-cuenta.md)  | Reservas públicas sin cuenta para el cliente final                           | Aceptada (se implementa en la Fase 4) |
| [0010](0010-proteccion-de-rutas-en-la-web.md) | Protección de rutas en la web con proxy.ts y la cookie bo_session            | Aceptada                              |
| [0011](0011-estado-del-negocio-en-la-web.md)  | Estado del negocio y pantallas de bloqueo en la web                          | Aceptada                              |
| [0012](0012-sistema-de-diseno.md)             | Sistema de diseño: estructura “Sillón” con colores “Rótulo”, solo tema claro | Aceptada                              |
