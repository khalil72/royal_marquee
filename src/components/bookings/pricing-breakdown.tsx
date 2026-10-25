import { cn } from "@/lib/utils";
import type { PaymentSummary, Totals } from "@/lib/calc";
import { formatMoney } from "@/lib/format";
import type { Charges } from "@/lib/types";

export function chargeLines(charges: Charges, guests: number, totals: Totals) {
  return [
    { label: "Hall rental", amount: charges.hallRent },
    {
      label: "Catering",
      detail: `${guests || 0} guests × ${formatMoney(charges.cateringPerPerson || 0)}`,
      amount: totals.catering,
    },
    { label: "Decoration", amount: charges.decoration },
    { label: "Stage setup", amount: charges.stage },
    { label: "Lighting", amount: charges.lighting },
    { label: "Sound system", amount: charges.sound },
    { label: "Additional services", detail: charges.additionalNote || undefined, amount: charges.additional },
  ];
}

function Row({
  label,
  detail,
  value,
  strong,
  tone,
}: {
  label: string;
  detail?: string;
  value: string;
  strong?: boolean;
  tone?: "danger" | "success" | "muted";
}) {
  return (
    <div className={cn("flex items-start justify-between gap-4 py-1.5 text-sm", strong && "font-semibold")}>
      <div className="min-w-0">
        <p className={cn(tone === "muted" && "text-muted-foreground")}>{label}</p>
        {detail && <p className="truncate text-xs text-muted-foreground">{detail}</p>}
      </div>
      <p
        className={cn(
          "shrink-0 tabular-nums",
          tone === "danger" && "text-destructive",
          tone === "success" && "text-success",
        )}
      >
        {value}
      </p>
    </div>
  );
}

export function PricingBreakdown({
  charges,
  guests,
  totals,
  summary,
  currency = "PKR",
  hideZero = false,
}: {
  charges: Charges;
  guests: number;
  totals: Totals;
  summary?: PaymentSummary;
  currency?: string;
  hideZero?: boolean;
}) {
  const lines = chargeLines(charges, guests, totals).filter((l) => !hideZero || (l.amount || 0) > 0);
  return (
    <div>
      <div className="divide-y divide-dashed">
        {lines.map((l) => (
          <Row key={l.label} label={l.label} detail={l.detail} value={formatMoney(l.amount || 0, currency)} />
        ))}
      </div>
      <div className="mt-2 border-t pt-2">
        <Row label="Subtotal" value={formatMoney(totals.subtotal, currency)} strong />
        <Row
          label={`Discount (${charges.discountPercent || 0}%)`}
          value={`− ${formatMoney(totals.discountAmount, currency)}`}
          tone="muted"
        />
        <Row
          label={`Tax (${charges.taxPercent || 0}%)`}
          value={`+ ${formatMoney(totals.taxAmount, currency)}`}
          tone="muted"
        />
      </div>
      <div className="mt-2 flex items-center justify-between rounded-lg bg-primary/8 px-3 py-2.5">
        <span className="font-semibold">Grand Total</span>
        <span className="text-lg font-bold text-primary tabular-nums">{formatMoney(totals.grandTotal, currency)}</span>
      </div>
      {summary && (
        <div className="mt-3 space-y-0.5">
          <Row label="Advance paid" value={formatMoney(summary.advance, currency)} tone="success" />
          <Row label="Additional payments" value={formatMoney(summary.additional, currency)} tone="success" />
          <Row label="Total paid" value={formatMoney(summary.totalPaid, currency)} strong />
          <div
            className={cn(
              "mt-2 flex items-center justify-between rounded-lg px-3 py-2.5",
              summary.remaining > 0 ? "bg-destructive/8" : "bg-success/10",
            )}
          >
            <span className="font-semibold">{summary.remaining < 0 ? "Credit / refund due" : "Remaining Balance"}</span>
            <span
              className={cn(
                "text-lg font-bold tabular-nums",
                summary.remaining > 0 ? "text-destructive" : "text-success",
              )}
            >
              {formatMoney(Math.abs(summary.remaining), currency)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
