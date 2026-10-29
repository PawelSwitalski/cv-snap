import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

const alertVariants = cva(
  "relative flex w-full flex-col gap-1 rounded-lg border px-3 py-2.5 text-sm [&_svg]:size-4",
  {
    variants: {
      variant: {
        default: "bg-card text-card-foreground",
        destructive: "border-destructive/50 text-destructive",
        warning: "border-warning/60 text-warning",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

/**
 * Status box. Callers choose the live-region role: `role="alert"` for errors, a polite status for
 * progress (ux-guide). Meaning is carried by text and icon, never by colour alone.
 */
export function Alert({
  className,
  variant,
  ...props
}: ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return <div className={cn(alertVariants({ variant }), className)} {...props} />;
}

export function AlertTitle({ className, ...props }: ComponentProps<"p">) {
  return <p className={cn("flex items-center gap-2 font-medium", className)} {...props} />;
}

export function AlertDescription({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("text-sm text-foreground/90", className)} {...props} />;
}
