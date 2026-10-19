export function FormAlert({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="rounded-lg border border-pole-line bg-pole-soft px-3 py-2.5 text-sm font-medium text-pole-ink"
    >
      {message}
    </p>
  );
}
