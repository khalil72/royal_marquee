"use client";

import Link from "next/link";
import { Building2, CalendarDays, Clock, Pencil, Phone, UserRound, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PaymentBadge, StatusBadge } from "@/components/shared/status-badge";
import { formatDate, formatDuration, formatMoney, formatTime } from "@/lib/format";
import type { BookingView } from "@/lib/hooks";

export function EventDialog({ view, onClose, currency }: { view: BookingView | null; onClose: () => void; currency: string }) {
  return (
    <Dialog open={!!view} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        {view && (
          <>
            <DialogHeader>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={view.booking.status} />
                <PaymentBadge status={view.summary.status} />
              </div>
              <DialogTitle className="pt-1 text-lg">{view.booking.event.title}</DialogTitle>
              <DialogDescription>
                {view.booking.bookingNumber} · {view.booking.event.type}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 text-sm">
              <p className="flex items-center gap-3"><CalendarDays className="size-4 text-muted-foreground" />{formatDate(view.booking.event.date, "EEEE, dd MMM yyyy")}</p>
              <p className="flex items-center gap-3">
                <Clock className="size-4 text-muted-foreground" />
                {formatTime(view.booking.event.startTime)} – {formatTime(view.booking.event.endTime)}
                {view.booking.event.overnight && " (next day)"} · {formatDuration(view.durationMinutes)}
              </p>
              <p className="flex items-center gap-3">
                <Building2 className="size-4 text-muted-foreground" />
                <span className="size-2.5 rounded-full" style={{ background: view.hall?.color }} />
                {view.hall?.name}{view.booking.event.venueArea && ` · ${view.booking.event.venueArea}`}
              </p>
              <p className="flex items-center gap-3"><UserRound className="size-4 text-muted-foreground" />{view.customer?.name}</p>
              <p className="flex items-center gap-3"><Phone className="size-4 text-muted-foreground" />{view.customer?.mobile}</p>
              <p className="flex items-center gap-3"><Users className="size-4 text-muted-foreground" />{view.booking.event.guests} guests</p>
              <div className="grid grid-cols-3 gap-2 rounded-lg bg-muted/50 p-3 text-center text-xs">
                <div><p className="text-muted-foreground">Total</p><p className="font-semibold tabular-nums">{formatMoney(view.totals.grandTotal, currency)}</p></div>
                <div><p className="text-muted-foreground">Paid</p><p className="font-semibold text-success tabular-nums">{formatMoney(view.summary.totalPaid, currency)}</p></div>
                <div><p className="text-muted-foreground">Balance</p><p className="font-semibold text-destructive tabular-nums">{formatMoney(view.summary.remaining, currency)}</p></div>
              </div>
            </div>
            <DialogFooter>
              <Button asChild variant="outline"><Link href={`/bookings/${view.booking.id}/edit`}><Pencil /> Edit</Link></Button>
              <Button asChild><Link href={`/bookings/${view.booking.id}`}>View details</Link></Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
