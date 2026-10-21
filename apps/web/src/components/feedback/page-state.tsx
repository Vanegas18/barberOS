import { CircleAlert, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PageLoading({ label }: { label: string }) {
  return (
    <div role="status" aria-live="polite" className="flex flex-col items-center gap-3 py-16">
      <span
        aria-hidden="true"
        className="size-8 animate-spin rounded-full border-[3px] border-sunken border-t-ink motion-reduce:animate-none"
      />
      <p className="text-[15px] text-ink-muted">{label}</p>
    </div>
  );
}

export function PageError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-start gap-4 rounded-lg border border-line bg-surface p-6">
      <p role="alert" className="flex items-start gap-2.5 text-[15px] leading-[22px] text-danger">
        <CircleAlert className="mt-0.5 size-[18px] shrink-0" aria-hidden="true" />
        <span>{message}</span>
      </p>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          <RotateCw aria-hidden="true" />
          Reintentar
        </Button>
      )}
    </div>
  );
}
