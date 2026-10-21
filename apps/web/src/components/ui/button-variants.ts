import { cva, type VariantProps } from "class-variance-authority";

export const buttonVariants = cva(
  [
    "group/button inline-flex shrink-0 items-center justify-center gap-2 rounded-full border border-transparent",
    "font-semibold whitespace-nowrap select-none",
    "transition-[transform,background-color,border-color,color] duration-150 ease-snap",
    "active:not-aria-[haspopup]:scale-[0.97]",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
    "disabled:cursor-not-allowed disabled:border-transparent disabled:bg-sunken disabled:text-ink-muted disabled:active:scale-100",
    "aria-busy:cursor-progress",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-[18px]",
  ],
  {
    variants: {
      variant: {
        default: "bg-ink text-white hover:bg-ink-hover",
        secondary: "border-control bg-surface text-ink hover:bg-ground",
        brand: "bg-brand text-ink hover:bg-brand-hover",
        soft: "bg-brand-soft text-brand-ink hover:bg-brand",
        ghost: "bg-transparent text-ink hover:bg-sunken",
        destructive: "border-danger bg-surface text-danger hover:bg-danger-soft",
        link: "h-auto rounded-sm px-0 text-ink underline underline-offset-4 hover:no-underline",
      },
      size: {
        /** 44px: mínimo táctil, el tamaño normal en todo el panel. */
        default: "h-11 px-5 text-[15px]",
        /** 48px: las acciones principales en móvil y en formularios. */
        lg: "h-12 px-6 text-base",
        /** 36px: solo controles de escritorio con mouse. Nunca en móvil. */
        sm: "h-9 px-3.5 text-sm",
        icon: "size-11",
        "icon-sm": "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export type ButtonVariantProps = VariantProps<typeof buttonVariants>;
