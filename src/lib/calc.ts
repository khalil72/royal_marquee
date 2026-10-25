import type { Charges, Payment, PaymentStatus } from "./types";

export interface Totals {
  catering: number;
  subtotal: number;
  discountAmount: number;
  taxableAmount: number;
  taxAmount: number;
  grandTotal: number;
}

const round = (n: number) => Math.round((Number.isFinite(n) ? n : 0) * 100) / 100;
const safe = (n: number) => (Number.isFinite(n) && n > 0 ? n : 0);

export function calculateTotals(charges: Charges, guests: number): Totals {
  const catering = round(safe(guests) * safe(charges.cateringPerPerson));
  const subtotal = round(
    safe(charges.hallRent) +
      catering +
      safe(charges.decoration) +
      safe(charges.stage) +
      safe(charges.lighting) +
      safe(charges.sound) +
      safe(charges.additional),
  );
  const discountPercent = Math.min(safe(charges.discountPercent), 100);
  const discountAmount = round((subtotal * discountPercent) / 100);
  const taxableAmount = round(subtotal - discountAmount);
  const taxAmount = round((taxableAmount * safe(charges.taxPercent)) / 100);
  const grandTotal = round(taxableAmount + taxAmount);
  return { catering, subtotal, discountAmount, taxableAmount, taxAmount, grandTotal };
}

export function activePayments(payments: Payment[]) {
  return payments.filter((p) => !p.voided);
}

export interface PaymentSummary {
  advance: number;
  additional: number;
  totalPaid: number;
  remaining: number;
  status: PaymentStatus;
}

export function summarizePayments(grandTotal: number, payments: Payment[]): PaymentSummary {
  const active = activePayments(payments);
  const advance = round(active.filter((p) => p.kind === "Advance").reduce((s, p) => s + p.amount, 0));
  const additional = round(
    active.filter((p) => p.kind === "Additional").reduce((s, p) => s + p.amount, 0),
  );
  const totalPaid = round(advance + additional);
  const remaining = round(grandTotal - totalPaid);
  return { advance, additional, totalPaid, remaining, status: paymentStatusFor(grandTotal, totalPaid) };
}

export function paymentStatusFor(grandTotal: number, totalPaid: number): PaymentStatus {
  if (totalPaid <= 0) return "Unpaid";
  if (totalPaid >= grandTotal) return "Paid";
  return "Partially Paid";
}
