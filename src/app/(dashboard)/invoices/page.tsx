"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { FileText, Printer, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { PaymentBadge, StatusBadge } from "@/components/shared/status-badge";
import { formatDate, formatMoney } from "@/lib/format";
import { useBookingViews } from "@/lib/hooks";
import { useStore } from "@/lib/store";

export default function InvoicesPage() {
  const invoices = useStore((s) => s.invoices);
  const currency = useStore((s) => s.settings.currency);
  const views = useBookingViews();
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    const byId = new Map(views.map((v) => [v.booking.id, v]));
    const q = query.trim().toLowerCase();
    return invoices
      .map((invoice) => ({ invoice, view: byId.get(invoice.bookingId) }))
      .filter(({ invoice, view }) =>
        !q ||
        [invoice.invoiceNumber, view?.booking.bookingNumber, view?.customer?.name, view?.booking.event.title]
          .filter(Boolean)
          .some((s) => s!.toLowerCase().includes(q)),
      )
      .sort((a, b) => b.invoice.issuedAt.localeCompare(a.invoice.issuedAt));
  }, [invoices, views, query]);

  return (
    <>
      <PageHeader title="Invoices" description="Invoices are generated from bookings. Open one to preview, print or download as PDF." />
      <div className="rounded-xl border bg-card shadow-xs">
        <div className="border-b p-4">
          <div className="relative max-w-sm">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search invoice, booking or customer…" className="h-9 pl-9" />
          </div>
        </div>
        {rows.length === 0 ? (
          <EmptyState
            icon={FileText}
            title={query ? "No invoices match your search" : "No invoices yet"}
            description="Use “Generate invoice” from a booking to create one."
            action={!query && <Button asChild variant="outline"><Link href="/bookings">Go to bookings</Link></Button>}
          />
        ) : (
          <div className="overflow-x-auto">
            <Table className="min-w-[900px]">
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Issued</TableHead>
                  <TableHead>Booking</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Event date</TableHead>
                  <TableHead className="text-right">Grand total</TableHead>
                  <TableHead className="text-right">Outstanding</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead><span className="sr-only">Actions</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(({ invoice, view }) => (
                  <TableRow key={invoice.id}>
                    <TableCell>
                      <Link href={`/invoices/${invoice.id}`} className="font-mono text-xs font-semibold text-primary hover:underline">
                        {invoice.invoiceNumber}
                      </Link>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{formatDate(invoice.issuedAt)}</TableCell>
                    <TableCell>
                      {view ? (
                        <div className="flex items-center gap-2">
                          <Link href={`/bookings/${view.booking.id}`} className="font-mono text-xs hover:underline">{view.booking.bookingNumber}</Link>
                          {view.booking.status === "Cancelled" && <StatusBadge status="Cancelled" />}
                        </div>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="font-medium">{view?.customer?.name ?? "—"}</TableCell>
                    <TableCell className="whitespace-nowrap">{view ? formatDate(view.booking.event.date) : "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">{view ? formatMoney(view.totals.grandTotal, currency) : "—"}</TableCell>
                    <TableCell className={cn("text-right tabular-nums", view && view.summary.remaining > 0 && "font-medium text-destructive")}>
                      {view ? formatMoney(view.summary.remaining, currency) : "—"}
                    </TableCell>
                    <TableCell>{view && <PaymentBadge status={view.summary.status} />}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button asChild variant="ghost" size="sm"><Link href={`/invoices/${invoice.id}`}>Preview</Link></Button>
                        <Button asChild variant="ghost" size="icon-sm" aria-label="Print invoice">
                          <Link href={`/invoices/${invoice.id}?print=1`}><Printer /></Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </>
  );
}
