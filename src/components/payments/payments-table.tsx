"use client";

import { useState } from "react";
import Link from "next/link";
import { Ban, Receipt } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { formatDate, formatMoney } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { Booking, Customer, Payment } from "@/lib/types";

export interface PaymentRow {
  payment: Payment;
  booking?: Booking;
  customer?: Customer;
}

export function PaymentsTable({ rows, showBooking = false }: { rows: PaymentRow[]; showBooking?: boolean }) {
  const currency = useStore((s) => s.settings.currency);
  const invoices = useStore((s) => s.invoices);
  const voidPayment = useStore((s) => s.voidPayment);
  const [voiding, setVoiding] = useState<Payment | null>(null);
  const [reason, setReason] = useState("");

  return (
    <>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Receipt</TableHead>
              <TableHead>Date</TableHead>
              {showBooking && <TableHead>Booking / Customer</TableHead>}
              <TableHead>Type</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead>Invoice</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="w-20 text-right">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(({ payment: p, booking, customer }) => {
              const invoice = invoices.find((i) => i.id === p.invoiceId);
              return (
                <TableRow key={p.id} className={cn(p.voided && "text-muted-foreground")}>
                  <TableCell className="font-mono text-xs">
                    {p.receiptNumber}
                    {p.voided && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="ml-2 rounded bg-destructive/10 px-1.5 py-0.5 font-sans text-[10px] font-semibold text-destructive uppercase">
                            Void
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          Voided {formatDate(p.voided.at)}: {p.voided.reason}
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{formatDate(p.date)}</TableCell>
                  {showBooking && (
                    <TableCell>
                      {booking ? (
                        <Link href={`/bookings/${booking.id}`} className="font-medium hover:underline">
                          {booking.bookingNumber}
                        </Link>
                      ) : (
                        "—"
                      )}
                      <p className="text-xs text-muted-foreground">{customer?.name}</p>
                    </TableCell>
                  )}
                  <TableCell>{p.kind}</TableCell>
                  <TableCell>{p.method}</TableCell>
                  <TableCell className="max-w-40 truncate text-muted-foreground">{p.reference || "—"}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {invoice ? (
                      <Link href={`/invoices/${invoice.id}`} className="hover:underline">
                        {invoice.invoiceNumber}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className={cn("text-right font-medium tabular-nums", p.voided && "line-through")}>
                    {formatMoney(p.amount, currency)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button asChild variant="ghost" size="icon-sm">
                            <Link href={`/payments/${p.id}/receipt`} aria-label="View receipt">
                              <Receipt />
                            </Link>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Receipt</TooltipContent>
                      </Tooltip>
                      {!p.voided && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon-sm" aria-label="Void payment" onClick={() => setVoiding(p)}>
                              <Ban />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Void payment</TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <ConfirmDialog
        open={!!voiding}
        onOpenChange={(o) => {
          if (!o) {
            setVoiding(null);
            setReason("");
          }
        }}
        title={`Void payment ${voiding?.receiptNumber ?? ""}?`}
        description="Payments are never deleted. A voided payment stays in the history for audit, but no longer counts towards the paid amount."
        confirmLabel="Void payment"
        destructive
        onConfirm={async () => {
          if (!voiding) return;
          const result = await voidPayment(voiding.id, reason);
          if (!result.ok) toast.error(result.error);
          else toast.success("Payment voided");
          setVoiding(null);
          setReason("");
        }}
      >
        <Textarea
          placeholder="Reason (required), e.g. entered twice, cheque bounced"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={2}
        />
      </ConfirmDialog>
    </>
  );
}
