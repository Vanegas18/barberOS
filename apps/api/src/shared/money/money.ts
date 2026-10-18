/**
 * Utilidades de dinero.
 * - Importes: enteros en la unidad mínima de la moneda (COP: 30000 = $30.000).
 * - Porcentajes: puntos base (bp). 100 bp = 1 %, 6000 bp = 60 %.
 */

export type Money = number;

const BP_DENOMINATOR = 10_000;

export function assertMoney(value: number, label = "importe"): asserts value is Money {
  if (!Number.isSafeInteger(value)) {
    throw new RangeError(`${label} debe ser un entero seguro, recibido: ${value}`);
  }
  if (value < 0) {
    throw new RangeError(`${label} no puede ser negativo, recibido: ${value}`);
  }
}

export function assertBasisPoints(value: number, label = "porcentaje"): void {
  if (!Number.isInteger(value) || value < 0 || value > BP_DENOMINATOR) {
    throw new RangeError(
      `${label} debe ser un entero entre 0 y ${BP_DENOMINATOR}, recibido: ${value}`,
    );
  }
}

/** Aplica un porcentaje (en puntos base) a un importe. Redondeo half-up. */
export function applyBasisPoints(amount: Money, rateBp: number): Money {
  assertMoney(amount, "base");
  assertBasisPoints(rateBp, "tasa");

  const product = amount * rateBp;
  if (!Number.isSafeInteger(product)) {
    throw new RangeError("El cálculo excede el rango seguro de enteros");
  }

  // División entera con redondeo half-up, sin usar coma flotante.
  const quotient = Math.floor(product / BP_DENOMINATOR);
  const remainder = product % BP_DENOMINATOR;
  return remainder * 2 >= BP_DENOMINATOR ? quotient + 1 : quotient;
}

/** Suma segura de importes. */
export function sumMoney(values: readonly Money[]): Money {
  let total = 0;
  for (const v of values) {
    assertMoney(v);
    total += v;
    if (!Number.isSafeInteger(total)) {
      throw new RangeError("La suma excede el rango seguro de enteros");
    }
  }
  return total;
}
