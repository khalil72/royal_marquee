"use client";

import { useMemo, useState } from "react";
import { Banknote, CircleDollarSign, Search, Wallet } from "lucide-react";
import { Combobox } from "@/components/shared/combobox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PaymentDialog } from "@/components/payments/payment-dialog";
import { PaymentsTable } from "@/components/payments/payments-table";
import { DatePicker } from "@/components/shared/date-picker";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { formatMoney } from "@/lib/format";
import { useBookingViews } from "@/lib/hooks";
import { useStore } from "@/lib/store";
import { PAYMENT_METHODS } from "@/lib/types";

const ALL = "all";

export default function PaymentsPage() {
  const payments = useStore((s) => s.payments);
  const currency = useStore((s) => s.settings.currency);
  const views = useBookingViews();
  const [query, setQuery] = useState("");
  const [method, setMethod] = useState(ALL);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [pickerBooking, setPickerBooking] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const byId = useMemo(() => new Map(views.map((v) => [v.booking.id, v])), [views]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return payments
      .filter((p) => {
        if (method !== ALL && p.method !== method) return false;
        if (from && p.date < from) return false;
        if (to && p.date > to) return false;
        if (!q) return true;
        const v = byId.get(p.bookingId);
        return [p.receiptNumber, p.reference, v?.booking.bookingNumber, v?.customer?.name]
          .filter(Boolean)
          .some((s) => s!.toLowerCase().includes(q));
      })
      .sort((a, b) => (b.date + b.createdAt).localeCompare(a.date + a.createdAt))
      .map((payment) => {
        const v = byId.get(payment.bookingId);
        return { payment, booking: v?.booking, customer: v?.customer };
      });
  }, [payments, byId, query, method, from, to]);

  const active = rows.filter((r) => !r.payment.voided);
  const received = active.reduce((s, r) => s + r.payment.amount, 0);
  const outstanding = views
    .filter((v) => v.booking.status !== "Cancelled")
    .reduce((s, v) => s + Math.max(0, v.summary.remaining), 0);

  const payable = views.filter((v) => v.booking.status !== "Cancelled" && v.summary.remaining > 0);
  const selectedView = byId.get(pickerBooking);

  return (
    <>
      <PageHeader
        title="Payments"
        description="Every payment is linked to its booking and invoice. Payments can be voided, never deleted."
        actions={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Combobox
              className="sm:w-72"
              options={payable.map((v) => ({
                value: v.booking.id,
                label: `${v.booking.bookingNumber} · ${v.customer?.name ?? ""}`,
                description: `Outstanding ${formatMoney(v.summary.remaining, currency)}`,
              }))}
              value={pickerBooking}
              onChange={setPickerBooking}
              placeholder="Select booking to receive payment"
              searchPlaceholder="Search booking or customer…"
              emptyText="No bookings with an outstanding balance."
            />
            <Button size="lg" disabled={!selectedView} onClick={() => setDialogOpen(true)}>
              <Wallet /> Add payment
            </Button>
          </div>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Received (filtered)" value={formatMoney(received, currency)} hint={`${active.length} active payments`} icon={Banknote} tone="success" />
        <StatCard label="Outstanding (all active bookings)" value={formatMoney(outstanding, currency)} hint={`${payable.length} bookings with a balance`} icon={CircleDollarSign} tone="danger" />
        <StatCard label="Voided payments" value={rows.length - active.length} hint="Kept for audit history" icon={Wallet} tone="warning" />
      </div>

      <div className="rounded-xl border bg-card shadow-xs">
        <div className="grid gap-2 border-b p-4 sm:grid-cols-2 lg:grid-cols-[minmax(220px,1fr)_180px_170px_170px]">
          <div className="relative sm:col-span-2 lg:col-span-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search receipt, reference, booking, customer…" className="h-9 pl-9" />
          </div>
          <Select value={method} onValueChange={setMethod}>
            <SelectTrigger className="h-9! w-full" aria-label="Payment method"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All methods</SelectItem>
              {PAYMENT_METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
          <DatePicker value={from} onChange={setFrom} placeholder="From date" />
          <DatePicker value={to} onChange={setTo} placeholder="To date" />
        </div>
        {rows.length ? (
          <PaymentsTable rows={rows} showBooking />
        ) : (
          <EmptyState icon={Wallet} title="No payments found" description="Payments recorded against bookings will appear here." />
        )}
      </div>

      {selectedView && (
        <PaymentDialog
          view={selectedView}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onRecorded={() => setPickerBooking("")}
        />
      )}
    </>
  );
}
