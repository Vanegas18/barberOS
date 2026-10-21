import { rateLimit } from "express-rate-limit";
import { env } from "../../config/env.js";

const tooMany = {
  error: {
    code: "TOO_MANY_REQUESTS",
    message: "Demasiados intentos. Inténtalo de nuevo más tarde.",
  },
};

// En pruebas automáticas se desactiva para no interferir con los tests de flujo.
const skip = () => env.NODE_ENV === "test";

/** Límite general para toda la API. */
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 300,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: tooMany,
  skip,
});

/** Límite estricto para login y registro (fuerza bruta). */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: tooMany,
  skip,
});

/** Crear negocio exige un código de activación: se limita para impedir probar códigos al azar. */
export const activationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: tooMany,
  skip,
});

/** Fábrica para probar el comportamiento del límite con valores pequeños. */
export function createLimiter(limit: number) {
  return rateLimit({
    windowMs: 60 * 1000,
    limit,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: tooMany,
  });
}
