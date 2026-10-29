import { cn } from "@/lib/utils";

/**
 * Step progress bar. `value` is 0–100; `label` names it for screen readers. The step text itself
 * is announced by the caller's `aria-live` region.
 */
export function Progress({
  value,
  label,
  className,
}: {
  value: number;
  label: string;
  className?: string;
}) {
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(value)}
      className={cn("h-2 w-full overflow-hidden rounded-full bg-secondary", className)}
    >
      <div
        className="h-full bg-primary transition-[width] duration-300"
        style={{ width: `${String(Math.max(0, Math.min(100, value)))}%` }}
      />
    </div>
  );
}
