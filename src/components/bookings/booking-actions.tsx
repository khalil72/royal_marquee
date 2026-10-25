"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Ban,
  CircleCheck,
  Ellipsis,
  Eye,
  FileText,
  Pencil,
  Printer,
  RotateCcw,
  Trash2,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { PaymentDialog } from "@/components/payments/payment-dialog";
import type { BookingView } from "@/lib/hooks";
import { useStore } from "@/lib/store";

type Pending = null | "confirm" | "cancel" | "restore" | "delete" | "payment";

/** Row-level action menu for a booking. */
export function BookingActionsMenu({ view }: { view: BookingView }) {
  const router = useRouter();
  const [pending, setPending] = useState<Pending>(null);
  const issueInvoice = useStore((s) => s.issueInvoice);
  const { booking } = view;

  const openInvoice = async (print = false) => {
    const result = await issueInvoice(booking.id);
    if (!result.ok) return toast.error(result.error);
    router.push(`/invoices/${result.data.id}${print ? "?print=1" : ""}`);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${booking.bookingNumber}`}>
            <Ellipsis />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem asChild>
            <Link href={`/bookings/${booking.id}`}><Eye /> View</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={`/bookings/${booking.id}/edit`}><Pencil /> Edit</Link>
          </DropdownMenuItem>
          {booking.status === "Pending" && (
            <DropdownMenuItem onSelect={() => setPending("confirm")}><CircleCheck /> Confirm</DropdownMenuItem>
          )}
          {booking.status !== "Cancelled" && (
            <DropdownMenuItem onSelect={() => setPending("payment")}><Wallet /> Add payment</DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => openInvoice()}><FileText /> Generate invoice</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => openInvoice(true)}><Printer /> Print</DropdownMenuItem>
          <DropdownMenuSeparator />
          {booking.status === "Cancelled" ? (
            <DropdownMenuItem onSelect={() => setPending("restore")}><RotateCcw /> Restore as pending</DropdownMenuItem>
          ) : (
            <DropdownMenuItem onSelect={() => setPending("cancel")}><Ban /> Cancel booking</DropdownMenuItem>
          )}
          <DropdownMenuItem variant="destructive" onSelect={() => setPending("delete")}><Trash2 /> Delete</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <BookingActionDialogs view={view} pending={pending} setPending={setPending} />
    </>
  );
}

/** Shared confirm/cancel/delete/payment dialogs for a booking. */
export function BookingActionDialogs({
  view,
  pending,
  setPending,
  onDeleted,
}: {
  view: BookingView;
  pending: Pending;
  setPending: (p: Pending) => void;
  onDeleted?: () => void;
}) {
  const setBookingStatus = useStore((s) => s.setBookingStatus);
  const deleteBooking = useStore((s) => s.deleteBooking);
  const [reason, setReason] = useState("");
  const { booking } = view;
  const close = (open: boolean) => {
    if (!open) {
      setPending(null);
      setReason("");
    }
  };

  const changeStatus = async (status: "Confirmed" | "Cancelled" | "Pending", note?: string) => {
    const result = await setBookingStatus(booking.id, status, note);
    if (!result.ok) toast.error(result.error, { duration: 8000 });
    else toast.success(`Booking ${booking.bookingNumber} marked as ${status.toLowerCase()}`);
    close(false);
  };

  return (
    <>
      <ConfirmDialog
        open={pending === "confirm"}
        onOpenChange={close}
        title="Confirm this booking?"
        description="Hall availability will be checked. The booking cannot be confirmed if the hall is already confirmed for an overlapping time."
        confirmLabel="Confirm booking"
        onConfirm={() => changeStatus("Confirmed")}
      />
      <ConfirmDialog
        open={pending === "restore"}
        onOpenChange={close}
        title="Restore this booking?"
        description="The booking returns to Pending status. Hall availability will be checked."
        confirmLabel="Restore"
        onConfirm={() => changeStatus("Pending", "Restored from cancelled")}
      />
      <ConfirmDialog
        open={pending === "cancel"}
        onOpenChange={close}
        title={`Cancel ${booking.bookingNumber}?`}
        description="The booking will be kept for records and clearly marked as cancelled. The hall slot will be released. Payment history is preserved."
        confirmLabel="Cancel booking"
        destructive
        onConfirm={() => changeStatus("Cancelled", reason.trim() || undefined)}
      >
        <Textarea placeholder="Reason for cancellation (optional)" value={reason} onChange={(e) => setReason(e.target.value)} rows={2} />
      </ConfirmDialog>
      <ConfirmDialog
        open={pending === "delete"}
        onOpenChange={close}
        title={`Delete ${booking.bookingNumber}?`}
        description={
          view.payments.length
            ? "This booking has payment records. To protect payment history it cannot be deleted — cancel it instead."
            : "This permanently removes the booking and its invoices. This cannot be undone."
        }
        confirmLabel="Delete permanently"
        destructive
        onConfirm={async () => {
          const result = await deleteBooking(booking.id);
          if (!result.ok) toast.error(result.error, { duration: 8000 });
          else {
            toast.success("Booking deleted");
            onDeleted?.();
          }
          close(false);
        }}
      />
      <PaymentDialog view={view} open={pending === "payment"} onOpenChange={close} />
    </>
  );
}
