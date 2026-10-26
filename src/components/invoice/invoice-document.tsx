import { forwardRef } from "react";
import { chargeLines } from "@/components/bookings/pricing-breakdown";
import { formatDate, formatDuration, formatMoney, formatTime } from "@/lib/format";
import type { BookingView } from "@/lib/hooks";
import type { Invoice, Settings } from "@/lib/types";
import { DocumentHeader } from "./document-header";

const statusColor = {
  Paid: "bg-[#dcfce7] text-[#166534]",
  "Partially Paid": "bg-[#fef3c7] text-[#92400e]",
  Unpaid: "bg-[#ffe4e6] text-[#9f1239]",
} as const;

/** Printable A4 invoice. Colours are fixed hex values so print/PDF output ignores the app theme. */
export const InvoiceDocument = forwardRef<HTMLDivElement, { view: BookingView; invoice: Invoice; settings: Settings }>(
  function InvoiceDocument({ view, invoice, settings }, ref) {
    const { booking, customer, hall, totals, summary } = view;
    const e = booking.event;
    const cur = settings.currency;
    const lines = chargeLines(booking.charges, e.guests, totals).filter((l) => (l.amount || 0) > 0);
    const activePayments = view.payments.filter((p) => !p.voided);

    return (
      <div
        ref={ref}
        className="print-area mx-auto w-full max-w-[210mm] bg-white p-6 text-[13px] text-[#0f172a] shadow-lg ring-1 ring-black/5 sm:p-10"
      >
        <DocumentHeader
          settings={settings}
          title="Invoice"
          meta={[
            ["Invoice #", invoice.invoiceNumber],
            ["Booking #", booking.bookingNumber],
            ["Issue date", formatDate(invoice.issuedAt)],
            ["Booking status", booking.status],
          ]}
        />

        <div className="mt-6 grid gap-4 sm:grid-cols-2 print:grid-cols-2">
          <div className="rounded-lg border border-[#e2e8f0] p-4">
            <p className="mb-2 text-[11px] font-semibold tracking-wider text-[#6d28d9] uppercase">Bill to</p>
            <p className="text-base font-semibold">{customer?.name ?? "—"}</p>
            <p className="text-[#475569]">{customer?.address}</p>
            <p className="text-[#475569]">Mobile: {customer?.mobile}</p>
            {customer?.whatsapp && customer.whatsapp !== customer.mobile && (
              <p className="text-[#475569]">WhatsApp: {customer.whatsapp}</p>
            )}
            {customer?.email && <p className="text-[#475569]">{customer.email}</p>}
            {customer?.cnic && <p className="text-[#475569]">CNIC: {customer.cnic}</p>}
          </div>
          <div className="rounded-lg border border-[#e2e8f0] p-4">
            <p className="mb-2 text-[11px] font-semibold tracking-wider text-[#6d28d9] uppercase">Event details</p>
            <dl className="grid grid-cols-[110px_1fr] gap-y-0.5">
              <dt className="text-[#64748b]">Event</dt>
              <dd className="font-medium">{e.title}</dd>
              <dt className="text-[#64748b]">Type</dt>
              <dd>{e.type}</dd>
              <dt className="text-[#64748b]">Date</dt>
              <dd>{formatDate(e.date, "EEEE, dd MMM yyyy")}</dd>
              <dt className="text-[#64748b]">Time</dt>
              <dd>
                {formatTime(e.startTime)} – {formatTime(e.endTime)}
                {e.overnight ? " (next day)" : ""} · {formatDuration(view.durationMinutes)}
              </dd>
              <dt className="text-[#64748b]">Guests</dt>
              <dd>{e.guests.toLocaleString()}</dd>
              <dt className="text-[#64748b]">Venue</dt>
              <dd>
                {hall ? view.space : "—"}
                {e.venueArea ? ` · ${e.venueArea}` : ""}
              </dd>
            </dl>
          </div>
        </div>

        <table className="mt-6 w-full border-collapse">
          <thead>
            <tr className="bg-[#5b21b6] text-left text-white">
              <th className="rounded-l-md px-3 py-2 font-semibold">#</th>
              <th className="px-3 py-2 font-semibold">Description</th>
              <th className="px-3 py-2 font-semibold">Details</th>
              <th className="rounded-r-md px-3 py-2 text-right font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l, i) => (
              <tr key={l.label} className="border-b border-[#e2e8f0]">
                <td className="px-3 py-2 text-[#64748b]">{i + 1}</td>
                <td className="px-3 py-2 font-medium">{l.label}</td>
                <td className="px-3 py-2 text-[#64748b]">{l.detail ?? ""}</td>
                <td className="px-3 py-2 text-right tabular-nums">{formatMoney(l.amount, cur)}</td>
              </tr>
            ))}
            {lines.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-4 text-center text-[#64748b]">No charges entered.</td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="mt-4 grid gap-6 sm:grid-cols-[1fr_300px] print:grid-cols-[1fr_300px]">
          <div>
            <p className="mb-2 text-[11px] font-semibold tracking-wider text-[#6d28d9] uppercase">Payments received</p>
            {activePayments.length ? (
              <table className="w-full text-[12px]">
                <tbody>
                  {activePayments.map((p) => (
                    <tr key={p.id} className="border-b border-dashed border-[#e2e8f0]">
                      <td className="py-1 pr-2">{formatDate(p.date)}</td>
                      <td className="py-1 pr-2">
                        {p.kind} · {p.method}
                        {p.reference ? ` (${p.reference})` : ""}
                      </td>
                      <td className="py-1 pr-2 font-mono text-[11px] text-[#64748b]">{p.receiptNumber}</td>
                      <td className="py-1 text-right tabular-nums">{formatMoney(p.amount, cur)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-[#64748b]">No payments received yet.</p>
            )}
            <div className="mt-4 flex items-center gap-2">
              <span className="text-[#64748b]">Payment status:</span>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusColor[summary.status]}`}>{summary.status}</span>
            </div>
          </div>
          <div className="space-y-1">
            <Row label="Subtotal" value={formatMoney(totals.subtotal, cur)} />
            <Row label={`Discount (${booking.charges.discountPercent || 0}%)`} value={`− ${formatMoney(totals.discountAmount, cur)}`} />
            <Row label={`Tax (${booking.charges.taxPercent || 0}%)`} value={`+ ${formatMoney(totals.taxAmount, cur)}`} />
            <div className="flex justify-between rounded-md bg-[#ede9fe] px-3 py-2 text-base font-bold text-[#4c1d95]">
              <span>Grand Total</span>
              <span className="tabular-nums">{formatMoney(totals.grandTotal, cur)}</span>
            </div>
            <Row label="Advance payment" value={`− ${formatMoney(summary.advance, cur)}`} />
            <Row label="Additional payments" value={`− ${formatMoney(summary.additional, cur)}`} />
            <div
              className={`flex justify-between rounded-md px-3 py-2 text-base font-bold ${
                summary.remaining > 0 ? "bg-[#ffe4e6] text-[#9f1239]" : "bg-[#dcfce7] text-[#166534]"
              }`}
            >
              <span>{summary.remaining < 0 ? "Credit due" : "Outstanding Balance"}</span>
              <span className="tabular-nums">{formatMoney(Math.abs(summary.remaining), cur)}</span>
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-6 text-[11.5px] leading-relaxed text-[#475569] sm:grid-cols-2 print:grid-cols-2">
          <div>
            <p className="mb-1 text-[11px] font-semibold tracking-wider text-[#6d28d9] uppercase">Terms & conditions</p>
            <ul className="list-disc space-y-0.5 pl-4">
              {settings.bookingTerms.split("\n").filter(Boolean).map((t, i) => <li key={i}>{t}</li>)}
            </ul>
          </div>
          <div>
            <p className="mb-1 text-[11px] font-semibold tracking-wider text-[#6d28d9] uppercase">Cancellation policy</p>
            <ul className="list-disc space-y-0.5 pl-4">
              {settings.cancellationPolicy.split("\n").filter(Boolean).map((t, i) => <li key={i}>{t}</li>)}
            </ul>
          </div>
        </div>

        <div className="mt-14 grid grid-cols-2 gap-10 text-center text-xs text-[#475569]">
          <div>
            <div className="mx-auto w-48 border-t border-[#94a3b8] pt-1">Customer signature</div>
          </div>
          <div>
            <div className="mx-auto w-48 border-t border-[#94a3b8] pt-1">Authorized signature</div>
            <p className="mt-0.5 font-medium">{settings.businessName}</p>
          </div>
        </div>

        {settings.invoiceFooter && (
          <p className="mt-8 border-t border-[#e2e8f0] pt-4 text-center text-xs text-[#64748b]">{settings.invoiceFooter}</p>
        )}
      </div>
    );
  },
);

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between px-3 py-0.5">
      <span className="text-[#64748b]">{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
