export type ErrorCode =
  | "BAD_REQUEST"
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "TOO_MANY_REQUESTS"
  | "INTERNAL_ERROR";

export class AppError extends Error {
  readonly status: number;
  readonly code: ErrorCode;
  readonly details?: unknown;

  constructor(status: number, code: ErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = code;
    this.details = details;
  }

  static badRequest(message = "Solicitud inválida", details?: unknown) {
    return new AppError(400, "BAD_REQUEST", message, details);
  }

  static validation(details: unknown, message = "Datos inválidos") {
    return new AppError(422, "VALIDATION_ERROR", message, details);
  }

  static unauthorized(message = "No autenticado") {
    return new AppError(401, "UNAUTHORIZED", message);
  }

  static forbidden(message = "No tienes permiso para realizar esta acción") {
    return new AppError(403, "FORBIDDEN", message);
  }

  static notFound(message = "Recurso no encontrado") {
    return new AppError(404, "NOT_FOUND", message);
  }

  static conflict(message = "Conflicto con el estado actual del recurso") {
    return new AppError(409, "CONFLICT", message);
  }
}
