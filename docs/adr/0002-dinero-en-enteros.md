# ADR 0002: Dinero en enteros y porcentajes en puntos base

- **Estado:** Aceptada
- **Fecha:** 2026-10

## Contexto

Comisiones, ventas y caja suman y reparten dinero. Con decimales aparecen errores de redondeo
(`0.1 + 0.2`), y en un cuadre de caja un peso de diferencia es un problema real.

## Decisión

- **Importes:** enteros en la unidad mínima de la moneda. COP: `30000` = $30.000.
- **Porcentajes:** puntos base. 100 bp = 1 %; 50 % = `5000`.
- `shared/money` valida (`assertMoney`, `assertBasisPoints`) y calcula con redondeo half-up.
- El formato a moneda local solo ocurre en la interfaz.

## Consecuencias

- Las sumas son exactas y comparables.
- Los repartos que no dividen exacto deben decidir explícitamente a quién va el residuo.
- Toda entrada de dinero se valida como entero seguro y no negativo.
