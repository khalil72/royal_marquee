"use client";

import { useRef } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DocumentHeader } from "@/components/invoice/document-header";
import { PrintToolbar } from "@/components/invoice/print-toolbar";
import { NotFoundState } from "@/components/shared/not-found-state";
import { PageHeader } from "@/components/shared/page-header";
import { formatDate, formatDateTime, formatMoney, formatTime } from "@/lib/format";
import { useBookingView } from "@/lib/hooks";
import { useStore } from "@/lib/store";

export default function ReceiptPage() {
  const { id } = useParams<{ id: string }>();
  const payment = useStore((s) => s.payments.find((p) => p.id === id));
  const settings = useStore((s) => s.settings);
  const invoice = useStore((s) => s.invoices.find((i) => i.id === payment?.invoiceId));
  const view = useBookingView(payment?.bookingId);
  const ref = useRef<HTMLDivElement>(null);

  if (!payment || !view) return <NotFoundState title="Receipt not found" backHref="/payments" backLabel="Back to payments" />;
  const cur = settings.currency;
  const { booking, customer, hall, totals } = view;

  // Balance after this payment, counting active payments up to and including it
  const ordered = view.payments.filter((p) => !p.voided);
  const index = ordered.findIndex((p) => p.id === payment.id);
  const paidToDate = ordered.slice(0, index + 1).reduce((s, p) => s + p.amount, 0);
  const balanceAfter = totals.grandTotal - paidToDate;

  return (
    <>
      <PageHeader
        backHref={`/bookings/${booking.id}`}
        title={`Receipt ${payment.receiptNumber}`}
        description={`${booking.bookingNumber} · ${customer?.name ?? ""}`}
        actions={
          <PrintToolbar targetRef={ref} filename={`${payment.receiptNumber}.pdf`}>
            <Button asChild variant="outline" size="lg">
              <Link href={`/bookings/${booking.id}`}><Eye /> View booking</Link>
            </Button>
          </PrintToolbar>
        }
      />
      <div className="overflow-x-auto rounded-xl bg-muted/40 p-2 sm:p-6 print:overflow-visible print:bg-transparent print:p-0">
        <div ref={ref} className="print-area relative mx-auto w-full max-w-[210mm] overflow-hidden bg-white p-6 text-[13px] text-[#0f172a] shadow-lg ring-1 ring-black/5 sm:p-10">
          {payment.voided && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <span className="-rotate-12 rounded-lg border-4 border-[#e11d48] px-6 py-2 text-6xl font-black tracking-widest text-[#e11d48] opacity-25">VOID</span>
            </div>
          )}
          <DocumentHeader
            settings={settings}
            title="Payment Receipt"
            meta={[
              ["Receipt #", payment.receiptNumber],
              ["Date", formatDate(payment.date)],
              ["Booking #", booking.bookingNumber],
              ...(invoice ? ([["Invoice #", invoice.invoiceNumber]] as [string, string][]) : []),
            ]}
          />
          <div className="mt-8 rounded-xl border border-[#e2e8f0] p-6">
            <p className="text-[#475569]">Received with thanks from</p>
            <p className="mt-1 text-xl font-semibold">{customer?.name ?? "—"}</p>
            <p className="text-[#475569]">
              {customer?.mobile} · {customer?.address}
            </p>
            <div className="mt-6 flex flex-wrap items-end justify-between gap-4 border-t border-dashed border-[#cbd5e1] pt-6">
              <div className="space-y-1 text-[#475569]">
                <p>
                  <span className="text-[#64748b]">For:</span> {booking.event.title} ({booking.event.type})
                </p>
                <p>
                  <span className="text-[#64748b]">Event:</span> {formatDate(booking.event.date, "EEE, dd MMM yyyy")},{" "}
                  {formatTime(booking.event.startTime)} – {formatTime(booking.event.endTime)} · {hall?.name}
                </p>
                <p>
                  <span className="text-[#64748b]">Payment:</span> {payment.kind} via {payment.method}
                  {payment.reference ? ` · Ref ${payment.reference}` : ""}
                </p>
                {payment.note && <p><span className="text-[#64748b]">Note:</span> {payment.note}</p>}
              </div>
              <div className="rounded-lg bg-[#ede9fe] px-5 py-3 text-right">
                <p className="text-xs font-medium text-[#6d28d9] uppercase">Amount received</p>
                <p className="text-2xl font-bold text-[#4c1d95] tabular-nums">{formatMoney(payment.amount, cur)}</p>
              </div>
            </div>
          </div>
          <div className="mt-6 grid grid-cols-3 gap-3 text-center">
            {[
              ["Grand total", formatMoney(totals.grandTotal, cur)],
              ["Paid to date", formatMoney(paidToDate, cur)],
              ["Balance after this payment", formatMoney(Math.max(0, balanceAfter), cur)],
            ].map(([k, v]) => (
              <div key={k} className="rounded-lg border border-[#e2e8f0] p-3">
                <p className="text-xs text-[#64748b]">{k}</p>
                <p className="mt-1 font-semibold tabular-nums">{v}</p>
              </div>
            ))}
          </div>
          {payment.voided && (
            <p className="mt-4 rounded-md bg-[#ffe4e6] p-3 text-xs text-[#9f1239]">
              This payment was voided on {formatDateTime(payment.voided.at)}. Reason: {payment.voided.reason}
            </p>
          )}
          <div className="mt-16 flex justify-end text-center text-xs text-[#475569]">
            <div>
              <div className="w-48 border-t border-[#94a3b8] pt-1">Authorized signature</div>
              <p className="mt-0.5 font-medium">{settings.businessName}</p>
            </div>
          </div>
          {settings.invoiceFooter && (
            <p className="mt-8 border-t border-[#e2e8f0] pt-4 text-center text-xs text-[#64748b]">{settings.invoiceFooter}</p>
          )}
        </div>
      </div>
    </>
  );
}
