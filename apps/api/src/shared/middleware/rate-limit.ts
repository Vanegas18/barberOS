import { rateLimit } from "express-rate-limit";
import { env } from "../../config/env.js";

const tooMany = {
  error: {
    code: "TOO_MANY_REQUESTS",
    message: "Demasiados intentos. Inténtalo de nuevo más tarde.",
  },
};

const skip = () => env.NODE_ENV === "test";

export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 300,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: tooMany,
  skip,
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: tooMany,
  skip,
});

export const activationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: tooMany,
  skip,
});

export const invitationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: tooMany,
  skip,
});

export function createLimiter(limit: number) {
  return rateLimit({
    windowMs: 60 * 1000,
    limit,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: tooMany,
  });
}
