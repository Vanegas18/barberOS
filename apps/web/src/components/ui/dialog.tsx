"use client";

import { X } from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogClose = DialogPrimitive.Close;

function DialogContent({
  className,
  children,
  title,
  description,
  ...props
}: ComponentProps<typeof DialogPrimitive.Content> & { title: string; description?: ReactNode }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-ink/40 data-[state=open]:animate-in data-[state=open]:fade-in-0 motion-reduce:animate-none" />
      <DialogPrimitive.Content
        className={cn(
          "fixed z-50 flex max-h-[92dvh] flex-col bg-surface shadow-float outline-none",
          "inset-x-0 bottom-0 rounded-t-xl pb-[env(safe-area-inset-bottom)]",
          "sm:inset-auto sm:top-1/2 sm:left-1/2 sm:w-[calc(100%-2rem)] sm:max-w-[520px] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl sm:pb-0",
          "data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom-8 data-[state=open]:duration-250 sm:data-[state=open]:slide-in-from-bottom-0 sm:data-[state=open]:fade-in-0 motion-reduce:animate-none",
          className,
        )}
        {...props}
      >
        <div className="flex items-start justify-between gap-3 border-b border-line-soft px-5 pt-5 pb-4 sm:px-6">
          <div className="flex flex-col gap-1">
            <DialogPrimitive.Title className="text-lg leading-6 font-bold">
              {title}
            </DialogPrimitive.Title>
            {description ? (
              <DialogPrimitive.Description className="text-sm text-ink-muted">
                {description}
              </DialogPrimitive.Description>
            ) : (
              <DialogPrimitive.Description className="sr-only">{title}</DialogPrimitive.Description>
            )}
          </div>
          <DialogPrimitive.Close
            aria-label="Cerrar"
            className="-mt-1 -mr-2 flex size-11 shrink-0 items-center justify-center rounded-full text-ink-soft transition-colors duration-150 hover:bg-sunken"
          >
            <X className="size-5" aria-hidden="true" />
          </DialogPrimitive.Close>
        </div>
        <div className="overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export { Dialog, DialogClose, DialogContent, DialogTrigger };
