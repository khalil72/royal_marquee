import { cn } from "@/lib/utils";
import { bookingStatusStyles, paymentStatusStyles } from "@/lib/ui";
import type { BookingStatus, PaymentStatus } from "@/lib/types";

const base = "inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium whitespace-nowrap";

export function StatusBadge({ status, className }: { status: BookingStatus; className?: string }) {
  const style = bookingStatusStyles[status];
  return (
    <span className={cn(base, style.badge, className)}>
      <span className={cn("size-1.5 rounded-full no-underline", style.dot)} />
      {status}
    </span>
  );
}

export function PaymentBadge({ status, className }: { status: PaymentStatus; className?: string }) {
  return <span className={cn(base, paymentStatusStyles[status], className)}>{status}</span>;
}
