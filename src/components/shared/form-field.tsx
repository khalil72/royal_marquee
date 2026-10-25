import * as React from "react";
import { cn } from "@/lib/utils";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function FormField({
  label,
  htmlFor,
  required,
  error,
  hint,
  className,
  children,
}: {
  label: string;
  htmlFor?: string;
  required?: boolean;
  error?: string;
  hint?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Field data-invalid={!!error || undefined} className={cn("gap-1.5", className)}>
      <FieldLabel htmlFor={htmlFor}>
        {label}
        {required && <span className="-ml-1 text-destructive">*</span>}
      </FieldLabel>
      {children}
      {error ? <FieldError>{error}</FieldError> : hint ? <FieldDescription className="text-xs">{hint}</FieldDescription> : null}
    </Field>
  );
}

export function SectionCard({
  icon: Icon,
  title,
  description,
  action,
  children,
  className,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-xl border bg-card shadow-xs", className)}>
      <header className="flex flex-wrap items-start justify-between gap-3 border-b px-5 py-4">
        <div className="flex min-w-[min(100%,16rem)] flex-1 items-start gap-3">
          {Icon && (
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon className="size-[18px]" />
            </div>
          )}
          <div>
            <h2 className="font-semibold leading-tight">{title}</h2>
            {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
          </div>
        </div>
        {action}
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

/** Numeric input with a currency/unit prefix. */
export const MoneyInput = React.forwardRef<
  HTMLInputElement,
  React.ComponentProps<"input"> & { prefix?: string; invalid?: boolean }
>(function MoneyInput({ prefix = "PKR", invalid, className, ...props }, ref) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-xs font-medium text-muted-foreground">
        {prefix}
      </span>
      <Input
        ref={ref}
        type="number"
        inputMode="decimal"
        min={0}
        step="any"
        aria-invalid={invalid || undefined}
        className={cn("h-9 pl-12 tabular-nums", className)}
        {...props}
      />
    </div>
  );
});

export const numberValue = (v: unknown) => (v === "" || v === null || v === undefined ? 0 : Number(v));
