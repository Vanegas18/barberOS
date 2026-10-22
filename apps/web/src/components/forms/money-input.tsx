"use client";

import { forwardRef, type ComponentProps } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Props = Omit<ComponentProps<typeof Input>, "value" | "onChange" | "type"> & {
  value: number | null | undefined;
  onChange: (value: number | null) => void;
};

const thousands = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 });

export const MoneyInput = forwardRef<HTMLInputElement, Props>(function MoneyInput(
  { value, onChange, className, ...props },
  ref,
) {
  return (
    <div className="relative">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-ink-muted"
      >
        $
      </span>
      <Input
        ref={ref}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        className={cn("pl-7 tabular-nums", className)}
        value={value === null || value === undefined ? "" : thousands.format(value)}
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, "").slice(0, 12);
          onChange(digits === "" ? null : Number(digits));
        }}
        {...props}
      />
    </div>
  );
});
