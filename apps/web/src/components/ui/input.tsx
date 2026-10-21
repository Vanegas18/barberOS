import * as React from "react";
import { cn } from "cn";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-11 w-full min-w-0 rounded-md border border-control bg-surface px-3.5 text-base text-ink",
        "placeholder:text-ink-muted",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
        "aria-invalid:border-2 aria-invalid:border-danger aria-invalid:px-[13px]",
        "disabled:cursor-not-allowed disabled:bg-sunken disabled:text-ink-muted",
        "file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
