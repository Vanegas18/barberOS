import { CircleAlert } from "lucide-react";

export function FormAlert({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="flex items-start gap-2.5 rounded-md bg-danger-soft px-3.5 py-3 text-sm leading-5 font-medium text-danger"
    >
      <CircleAlert className="mt-px size-[18px] shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </p>
  );
}
