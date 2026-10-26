import Link from "next/link";
import { CircleCheck, CircleX, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDate, formatTime } from "@/lib/format";
import { spaceLabel, type ConflictResult } from "@/lib/schedule";
import type { Booking, Customer, Hall } from "@/lib/types";

function ConflictList({ items, customers, halls }: { items: Booking[]; customers: Customer[]; halls: Hall[] }) {
  return (
    <ul className="mt-2 space-y-1">
      {items.map((b) => (
        <li key={b.id} className="text-xs">
          <Link href={`/bookings/${b.id}`} target="_blank" className="font-medium underline underline-offset-2">
            {b.bookingNumber}
          </Link>{" "}
          · {b.event.title} · {spaceLabel(halls.find((h) => h.id === b.event.hallId), b.event.portionId)} · {formatDate(b.event.date)} {formatTime(b.event.startTime)}–{formatTime(b.event.endTime)}
          {b.event.overnight && " (+1 day)"} · {customers.find((c) => c.id === b.customerId)?.name ?? "—"} ·{" "}
          <span className="font-medium">{b.status}</span>
        </li>
      ))}
    </ul>
  );
}

export function AvailabilityAlert({
  conflicts,
  customers,
  halls = [],
  ready,
  className,
}: {
  conflicts: ConflictResult;
  customers: Customer[];
  halls?: Hall[];
  /** Hall, date and valid times are all selected */
  ready: boolean;
  className?: string;
}) {
  if (!ready) {
    return (
      <div className={cn("rounded-lg border border-dashed p-3 text-sm text-muted-foreground", className)}>
        Select a hall, date and time to check availability.
      </div>
    );
  }
  if (conflicts.blocking.length) {
    return (
      <div role="alert" className={cn("rounded-lg border border-destructive/30 bg-destructive/8 p-3 text-destructive", className)}>
        <p className="flex items-center gap-2 text-sm font-semibold">
          <CircleX className="size-4" /> Already booked for this time
        </p>
        <p className="mt-1 text-xs">
          Choose a different hall, portion or time. Overlapping confirmed bookings are not allowed, and a full-hall
          booking blocks every portion.
        </p>
        <ConflictList items={conflicts.blocking} customers={customers} halls={halls} />
      </div>
    );
  }
  if (conflicts.tentative.length) {
    return (
      <div role="status" className={cn("rounded-lg border border-warning/40 bg-warning/10 p-3 text-amber-800 dark:text-amber-200", className)}>
        <p className="flex items-center gap-2 text-sm font-semibold">
          <TriangleAlert className="size-4" /> Overlaps a pending booking
        </p>
        <p className="mt-1 text-xs">
          You can save, but only one of these bookings can be confirmed for this hall and time.
        </p>
        <ConflictList items={conflicts.tentative} customers={customers} halls={halls} />
      </div>
    );
  }
  return (
    <div role="status" className={cn("rounded-lg border border-success/30 bg-success/10 p-3 text-success", className)}>
      <p className="flex items-center gap-2 text-sm font-semibold">
        <CircleCheck className="size-4" /> Hall is available
      </p>
      <p className="mt-0.5 text-xs opacity-90">No other bookings in this hall overlap the selected time.</p>
    </div>
  );
}
