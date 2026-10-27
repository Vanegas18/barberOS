# ADR 0011: Estado del negocio y pantallas de bloqueo en la web

- **Estado:** Aceptada
- **Fecha:** 2026-10

## Contexto

Un negocio puede estar suspendido o con la prueba vencida. El dueño necesita saber qué pasó y
cómo resolverlo; el equipo, a quién avisar. El estado puede cambiar mientras alguien usa el
panel.

## Decisión

- `GET /me/businesses` trae `status`, `trialEndsAt` y `access`, calculado por la API.
- El panel resuelve el slug contra esa lista. Con `access` distinto de `ok` muestra una pantalla
  de bloqueo completa, sin menú. El dueño ve el contacto de soporte (WhatsApp configurable con
  `NEXT_PUBLIC_SUPPORT_WHATSAPP`); admin y barberos, "avísale al dueño".
- Si una petición responde 403 `BUSINESS_SUSPENDED` o `TRIAL_EXPIRED`, la web recarga "mis
  negocios" y el bloqueo aparece sin recargar la página.
- El 401 solo redirige en **consultas**. En mutaciones no, porque un login fallido responde 401
  y su formulario muestra el mensaje.

## Consecuencias

- Una sola fuente de verdad (la API) para el estado comercial.
- Los datos nunca se borran por una suspensión.
