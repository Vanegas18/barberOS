# ADR 0012: Sistema de diseño: estructura “Sillón” con colores “Rótulo”, solo tema claro

- **Estado:** Aceptada
- **Fecha:** 2026-10

## Contexto

La primera versión usaba azul marino y rojo de poste de barbería. En el rediseño se compararon
tres direcciones de arte y se eligió la estructura “Sillón” (tarjetas de silla, pills, radio 20,
Schibsted Grotesk) con los colores de “Rótulo” (amarillo, negro y blanco). La app se usa en
locales con mucha luz y en celulares de gama media.

## Decisión

- **Solo tema claro.** Sin modo oscuro.
- **Paleta cerrada** en Tailwind v4 (`--color-*: initial`), definida en `app/globals.css`:
  - Superficies: `ground #f4f4f4`, `surface #fff`, `sunken #eee`. Líneas: `line`, `line-soft`,
    `line-strong`, `control`.
  - Texto: `ink #141414`, `ink-soft`, `ink-muted #595959`.
  - Marca: `brand #ffd23f`, `brand-hover`, `brand-soft`, `brand-ink`. Estados: `danger*`,
    `success*`, `pending-line`. Avatares: `person-a/b/c`.
- **El amarillo nunca es texto sobre blanco** (contraste insuficiente); sí fondo con texto `ink`.
- Tokens de shadcn mapeados: `primary = ink`, `secondary = brand-soft`, `destructive = danger`,
  `ring = ink`.
- Tipografía: Schibsted Grotesk (variable 400–900), cifras tabulares en todo el cuerpo.
- Radios 8 / 12 / 20 / 24. Objetivos táctiles de al menos 44 px. Foco visible con contorno `ink`.
- Movimiento: 150 ms de respuesta, 200 ms de cambio de estado, 250 ms para paneles; solo
  `transform` y `opacity`; respeta `prefers-reduced-motion`.
- **Estados de cita con palabras**, nunca solo con color: Por confirmar (amarillo suave y borde
  punteado), Confirmada, En silla (negro con texto amarillo), Atendida, No asistió (rojo suave,
  tachado), Sin cita y Libre.
- Navegación: sidebar amarillo de 240 px en escritorio; en móvil, barra superior amarilla y
  barra inferior blanca fija (4 destinos y "Más" para dueño y admin; 3 para el barbero).

## Consecuencias

- `src/styles/contrast.test.ts` verifica el contraste de los pares de texto y fondo.
- Un color fuera de la paleta no existe en Tailwind: obliga a pasar por los tokens.
- Adaptar el producto a otro nicho es cambiar tokens, no componentes.
