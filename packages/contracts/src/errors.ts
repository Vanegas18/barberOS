/** Códigos de error que devuelve la API en `error.code`. El frontend decide mensajes con ellos. */
export const API_ERROR_CODES = [
  "BAD_REQUEST",
  "VALIDATION_ERROR",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "NOT_FOUND",
  "CONFLICT",
  "TOO_MANY_REQUESTS",
  "INTERNAL_ERROR",
  "INVALID_ACTIVATION_CODE",
  "BUSINESS_SUSPENDED",
  "TRIAL_EXPIRED",
  "INVITATION_INVALID",
  "SLOT_TAKEN",
  "INVALID_STATUS_CHANGE",
  "UNDO_NOT_AVAILABLE",
] as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[number];
