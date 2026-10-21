import type { FieldPath, FieldValues, UseFormSetError } from "react-hook-form";
import { ApiError } from "./client";

interface Issue {
  path?: unknown;
  message?: unknown;
}

export function applyFieldErrors<T extends FieldValues>(
  err: unknown,
  setError: UseFormSetError<T>,
  fields: readonly FieldPath<T>[],
  messages: Partial<Record<FieldPath<T>, string>> = {},
): boolean {
  if (!(err instanceof ApiError) || !Array.isArray(err.details)) return false;
  let applied = false;
  for (const issue of err.details as Issue[]) {
    const path = issue.path as FieldPath<T>;
    if (typeof issue.path === "string" && fields.includes(path)) {
      const message = messages[path] ?? (typeof issue.message === "string" ? issue.message : "");
      setError(path, { message }, { shouldFocus: !applied });
      applied = true;
    }
  }
  return applied;
}
