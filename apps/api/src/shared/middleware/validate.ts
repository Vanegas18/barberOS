import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";
import { AppError } from "../errors/app-error.js";

interface ValidationSchemas {
  body?: ZodType;
  params?: ZodType;
  query?: ZodType;
}

/**
 * Valida body, params y query. Los datos validados se guardan en `req.validated`
 * y los controladores deben leer de ahí, nunca de req.body directamente.
 */
export function validate(schemas: ValidationSchemas) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const validated: { body?: unknown; params?: unknown; query?: unknown } = {};
    const issues: { part: string; path: string; message: string }[] = [];

    for (const part of ["body", "params", "query"] as const) {
      const schema = schemas[part];
      if (!schema) continue;

      const result = schema.safeParse(req[part]);
      if (result.success) {
        validated[part] = result.data;
      } else {
        for (const issue of result.error.issues) {
          issues.push({ part, path: issue.path.join("."), message: issue.message });
        }
      }
    }

    if (issues.length > 0) {
      return next(AppError.validation(issues));
    }

    req.validated = validated;
    next();
  };
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      validated: { body?: unknown; params?: unknown; query?: unknown };
    }
  }
}
