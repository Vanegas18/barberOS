import type { NextFunction, Request, Response } from "express";
import { AppError } from "../errors/app-error.js";
import { logger } from "../logger.js";

export function notFoundHandler(_req: Request, _res: Response, next: NextFunction): void {
  next(AppError.notFound("Ruta no encontrada"));
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  // Cuerpo JSON mal formado (lo lanza express.json)
  const isBadJson =
    err instanceof SyntaxError && "status" in err && (err as { status?: number }).status === 400;

  const appError = isBadJson
    ? AppError.badRequest("JSON inválido")
    : err instanceof AppError
      ? err
      : null;

  if (appError) {
    res.status(appError.status).json({
      error: {
        code: appError.code,
        message: appError.message,
        ...(appError.details !== undefined && { details: appError.details }),
        requestId: req.id,
      },
    });
    return;
  }

  // Error inesperado: se registra completo, pero al cliente solo le damos un mensaje genérico
  logger.error({ err, requestId: req.id }, "Error no controlado");
  res.status(500).json({
    error: {
      code: "INTERNAL_ERROR",
      message: "Error interno del servidor",
      requestId: req.id,
    },
  });
}
