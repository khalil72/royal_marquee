/**
 * Pure business rules. Every operation takes the current data snapshot and returns
 * the next snapshot (unchanged records keep their object identity, so callers can
 * diff by reference) plus the operation's value. Runs on the server.
 */
import { calculateTotals, summarizePayments } from "./calc";
import { formatDate, formatMoney, formatTime } from "./format";
import { OCCUPYING, canBookFullHall, findConflicts, findPortion, spaceLabel, validateTimeRange } from "./schedule";
import { defaultSettings, demoData, emptyData } from "./seed";
import type {
  AppData,
  Booking,
  BookingSource,
  BookingStatus,
  Charges,
  Customer,
  EventDetails,
  Hall,
  Invoice,
  Payment,
  PaymentMethod,
  Settings,
} from "./types";

export type Result<T = void> = { ok: true; data: T } | { ok: false; error: string };
export type Outcome<T> = Result<{ next: AppData; value: T }>;

const done = <T,>(next: AppData, value: T): Outcome<T> => ({ ok: true, data: { next, value } });
const fail = <T,>(error: string): Outcome<T> => ({ ok: false, error });

export type CustomerInput = Omit<Customer, "id" | "createdAt">;
export type HallInput = Omit<Hall, "id" | "createdAt">;

export interface PaymentInput {
  amount: number;
  date: string;
  method: PaymentMethod;
  reference?: string;
  note?: string;
  kind?: Payment["kind"];
}

export interface BookingInput {
  customerId?: string;
  customer: CustomerInput;
  event: EventDetails;
  status: BookingStatus;
  source: BookingSource;
  charges: Charges;
  notes?: string;
  advance?: PaymentInput;
}

const newId = () => crypto.randomUUID();
const nowIso = () => new Date().toISOString();
const pad = (n: number, w: number) => String(n).padStart(w, "0");
const normalizePhone = (p: string) => p.replace(/\D/g, "").replace(/^92/, "0");

function uniqueNumber(make: (n: number) => string, start: number, taken: Set<string>) {
  let n = Math.max(1, start);
  while (taken.has(make(n))) n++;
  return { value: make(n), next: n + 1 };
}

function describeConflict(b: Booking, customers: Customer[], halls: Hall[] = []) {
  const customer = customers.find((c) => c.id === b.customerId);
  const hall = halls.find((h) => h.id === b.event.hallId);
  const space = hall?.divided ? `${spaceLabel(hall, b.event.portionId)}, ` : "";
  return `${b.bookingNumber} — ${b.event.title} (${space}${formatDate(b.event.date)}, ${formatTime(
    b.event.startTime,
  )}–${formatTime(b.event.endTime)}${customer ? `, ${customer.name}` : ""})`;
}

/** Store "full hall" as a missing portionId rather than an empty string. */
function withCleanPortion(input: BookingInput): BookingInput {
  const { portionId, ...event } = input.event;
  return { ...input, event: portionId ? { ...event, portionId } : event };
}

function validateBookingInput(data: AppData, input: BookingInput, excludeId?: string): string | null {
  const e = input.event;
  const hall = data.halls.find((h) => h.id === e.hallId);
  if (!hall) return "Please select a valid hall.";
  const existing = excludeId && data.bookings.find((b) => b.id === excludeId);
  if (!hall.active && (!existing || existing.event.hallId !== hall.id)) {
    return `${hall.name} is inactive and cannot take new bookings.`;
  }
  // An existing booking may keep its space even if that space was since made unavailable
  const sameSpace =
    !!existing && existing.event.hallId === hall.id && (existing.event.portionId || "") === (e.portionId || "");
  if (e.portionId) {
    const portion = findPortion(hall, e.portionId);
    if (!portion || (!hall.divided && !sameSpace)) return `Please select a valid portion of ${hall.name}.`;
    if (!portion.active && !sameSpace) return `${hall.name} · ${portion.name} is unavailable for new bookings.`;
  } else if (!canBookFullHall(hall) && !sameSpace) {
    return `${hall.name} is booked by portion only. Please select a portion.`;
  }
  const timeError = validateTimeRange(e.startTime, e.endTime, e.overnight);
  if (timeError) return timeError;
  const { blocking } = findConflicts(e, input.status, data.bookings, excludeId);
  if (blocking.length) {
    return `${spaceLabel(hall, e.portionId)} is already booked for this time: ${blocking
      .map((b) => describeConflict(b, data.customers, data.halls))
      .join("; ")}`;
  }
  if (input.charges.discountPercent > data.settings.maxDiscountPercent) {
    return `Discount cannot exceed ${data.settings.maxDiscountPercent}% (see Settings).`;
  }
  return null;
}

/** Create or update the customer attached to a booking. Matches existing customers by mobile. */
function upsertCustomer(data: AppData, customerId: string | undefined, input: CustomerInput) {
  const existing =
    (customerId && data.customers.find((c) => c.id === customerId)) ||
    data.customers.find((c) => normalizePhone(c.mobile) === normalizePhone(input.mobile));
  if (existing) {
    const updated = { ...existing, ...input };
    return { data: { ...data, customers: data.customers.map((c) => (c.id === existing.id ? updated : c)) }, customer: updated };
  }
  const created: Customer = { ...input, id: newId(), createdAt: nowIso() };
  return { data: { ...data, customers: [created, ...data.customers] }, customer: created };
}

function latestInvoiceId(data: AppData, bookingId: string) {
  return data.invoices
    .filter((i) => i.bookingId === bookingId)
    .sort((a, b) => b.issuedAt.localeCompare(a.issuedAt))[0]?.id;
}

function recordPayment(data: AppData, bookingId: string, input: PaymentInput, kind: Payment["kind"]) {
  const { value, next } = uniqueNumber(
    (n) => `${data.settings.receiptPrefix}${pad(n, 5)}`,
    data.settings.nextReceiptNumber,
    new Set(data.payments.map((p) => p.receiptNumber)),
  );
  const payment: Payment = {
    id: newId(),
    receiptNumber: value,
    bookingId,
    invoiceId: latestInvoiceId(data, bookingId),
    kind,
    date: input.date,
    amount: Math.round(input.amount * 100) / 100,
    method: input.method,
    reference: input.reference?.trim() || "",
    note: input.note?.trim() || "",
    createdAt: nowIso(),
  };
  return {
    data: { ...data, payments: [...data.payments, payment], settings: { ...data.settings, nextReceiptNumber: next } },
    payment,
  };
}

function bookingSummary(data: AppData, b: Booking) {
  const totals = calculateTotals(b.charges, b.event.guests);
  const summary = summarizePayments(totals.grandTotal, data.payments.filter((p) => p.bookingId === b.id));
  return { totals, summary };
}

// ---------- Customers ----------

export function addCustomer(data: AppData, input: CustomerInput): Outcome<Customer> {
  const dup = data.customers.find((c) => normalizePhone(c.mobile) === normalizePhone(input.mobile));
  if (dup) return fail(`A customer with this mobile number already exists (${dup.name}).`);
  const customer: Customer = { ...input, id: newId(), createdAt: nowIso() };
  return done({ ...data, customers: [customer, ...data.customers] }, customer);
}

export function updateCustomer(data: AppData, id: string, input: CustomerInput): Outcome<Customer> {
  const dup = data.customers.find((c) => c.id !== id && normalizePhone(c.mobile) === normalizePhone(input.mobile));
  if (dup) return fail(`Another customer already uses this mobile number (${dup.name}).`);
  const current = data.customers.find((c) => c.id === id);
  if (!current) return fail("Customer not found.");
  const updated = { ...current, ...input };
  return done({ ...data, customers: data.customers.map((c) => (c.id === id ? updated : c)) }, updated);
}

export function deleteCustomer(data: AppData, id: string): Outcome<null> {
  if (!data.customers.some((c) => c.id === id)) return fail("Customer not found.");
  const count = data.bookings.filter((b) => b.customerId === id).length;
  if (count) return fail(`This customer has ${count} booking(s) and cannot be deleted.`);
  return done({ ...data, customers: data.customers.filter((c) => c.id !== id) }, null);
}

// ---------- Halls ----------

/** Give new portions ids and check the division settings make sense. Returns an error message or the input. */
function prepareHallInput(input: HallInput): string | HallInput {
  const portions = (input.portions ?? []).map((p) => ({ ...p, name: p.name.trim(), id: p.id || newId() }));
  const names = new Set<string>();
  for (const p of portions) {
    const key = p.name.toLowerCase();
    if (names.has(key)) return `Two portions are named "${p.name}". Portion names must be unique.`;
    names.add(key);
  }
  const divided = !!input.divided;
  if (divided && portions.length < 2) return "A divided hall needs at least two portions.";
  if (divided && portions.some((p) => p.capacity > input.capacity)) {
    return "A portion cannot hold more guests than the hall's total capacity.";
  }
  return { ...input, divided, allowFullBooking: input.allowFullBooking !== false, portions };
}

export function addHall(data: AppData, input: HallInput): Outcome<Hall> {
  if (data.halls.some((h) => h.name.trim().toLowerCase() === input.name.trim().toLowerCase()))
    return fail("A hall with this name already exists.");
  const prepared = prepareHallInput(input);
  if (typeof prepared === "string") return fail(prepared);
  const hall: Hall = { ...prepared, id: newId(), createdAt: nowIso() };
  return done({ ...data, halls: [...data.halls, hall] }, hall);
}

export function updateHall(data: AppData, id: string, input: HallInput): Outcome<Hall> {
  const current = data.halls.find((h) => h.id === id);
  if (!current) return fail("Hall not found.");
  if (data.halls.some((h) => h.id !== id && h.name.trim().toLowerCase() === input.name.trim().toLowerCase()))
    return fail("A hall with this name already exists.");
  const prepared = prepareHallInput(input);
  if (typeof prepared === "string") return fail(prepared);

  // Existing bookings must keep a valid space: don't remove portions they use, or undivide under them
  const live = data.bookings.filter((b) => b.event.hallId === id && OCCUPYING.includes(b.status));
  const keptIds = new Set(prepared.portions?.map((p) => p.id));
  for (const portion of current.portions ?? []) {
    const count = live.filter((b) => b.event.portionId === portion.id).length;
    if (!count) continue;
    if (!keptIds.has(portion.id))
      return fail(`${portion.name} has ${count} active booking(s). Mark it unavailable instead of removing it.`);
    if (!prepared.divided)
      return fail(`${portion.name} has ${count} active booking(s), so this hall must stay divided.`);
  }
  const updated = { ...current, ...prepared };
  return done({ ...data, halls: data.halls.map((h) => (h.id === id ? updated : h)) }, updated);
}

export function deleteHall(data: AppData, id: string): Outcome<null> {
  if (!data.halls.some((h) => h.id === id)) return fail("Hall not found.");
  const count = data.bookings.filter((b) => b.event.hallId === id).length;
  if (count) return fail(`This hall has ${count} booking(s). Mark it inactive instead of deleting it.`);
  return done({ ...data, halls: data.halls.filter((h) => h.id !== id) }, null);
}

// ---------- Bookings ----------

export function createBooking(data: AppData, input: BookingInput): Outcome<Booking> {
  input = withCleanPortion(input);
  const error = validateBookingInput(data, input);
  if (error) return fail(error);

  const totals = calculateTotals(input.charges, input.event.guests);
  const advance = input.advance && input.advance.amount > 0 ? input.advance : undefined;
  if (advance && !data.settings.allowOverpayment && advance.amount > totals.grandTotal) {
    return fail(`Advance payment cannot exceed the grand total (${formatMoney(totals.grandTotal)}).`);
  }
  if (advance && input.status === "Cancelled") return fail("Cannot record an advance on a cancelled booking.");

  const withCustomer = upsertCustomer(data, input.customerId, input.customer);
  let next = withCustomer.data;
  const year = new Date().getFullYear();
  const { value, next: nextNumber } = uniqueNumber(
    (n) => `${next.settings.bookingPrefix}${year}-${pad(n, 4)}`,
    next.settings.nextBookingNumber,
    new Set(next.bookings.map((b) => b.bookingNumber)),
  );
  const at = nowIso();
  const booking: Booking = {
    id: newId(),
    bookingNumber: value,
    createdAt: at,
    updatedAt: at,
    customerId: withCustomer.customer.id,
    event: input.event,
    status: input.status,
    source: input.source,
    charges: input.charges,
    notes: input.notes,
    statusHistory: [{ status: input.status, at, note: "Booking created" }],
  };
  next = { ...next, bookings: [booking, ...next.bookings], settings: { ...next.settings, nextBookingNumber: nextNumber } };
  if (advance) next = recordPayment(next, booking.id, advance, "Advance").data;
  return done(next, booking);
}

export function updateBooking(data: AppData, id: string, input: BookingInput): Outcome<Booking> {
  const current = data.bookings.find((b) => b.id === id);
  if (!current) return fail("Booking not found.");
  input = withCleanPortion(input);
  const error = validateBookingInput(data, input, id);
  if (error) return fail(error);
  const withCustomer = upsertCustomer(data, input.customerId, input.customer);
  const at = nowIso();
  const updated: Booking = {
    ...current,
    customerId: withCustomer.customer.id,
    event: input.event,
    status: input.status,
    source: input.source,
    charges: input.charges,
    notes: input.notes,
    updatedAt: at,
    statusHistory:
      current.status !== input.status
        ? [...current.statusHistory, { status: input.status, at, note: "Updated from edit form" }]
        : current.statusHistory,
  };
  const next = withCustomer.data;
  return done({ ...next, bookings: next.bookings.map((b) => (b.id === id ? updated : b)) }, updated);
}

export function setBookingStatus(data: AppData, id: string, status: BookingStatus, note?: string): Outcome<Booking> {
  const current = data.bookings.find((b) => b.id === id);
  if (!current) return fail("Booking not found.");
  if (current.status === status) return done(data, current);
  if (status !== "Cancelled") {
    const { blocking } = findConflicts(current.event, status, data.bookings, id);
    if (blocking.length) {
      return fail(
        `Cannot mark as ${status}: hall is already booked by ${blocking.map((b) => describeConflict(b, data.customers, data.halls)).join("; ")}`,
      );
    }
  }
  const at = nowIso();
  const updated: Booking = {
    ...current,
    status,
    updatedAt: at,
    statusHistory: [...current.statusHistory, { status, at, note }],
  };
  return done({ ...data, bookings: data.bookings.map((b) => (b.id === id ? updated : b)) }, updated);
}

export function deleteBooking(data: AppData, id: string): Outcome<null> {
  if (!data.bookings.some((b) => b.id === id)) return fail("Booking not found.");
  const linked = data.payments.filter((p) => p.bookingId === id);
  if (linked.length) {
    return fail(
      `This booking has ${linked.length} payment record(s). Payment history is protected — cancel the booking instead.`,
    );
  }
  return done(
    {
      ...data,
      bookings: data.bookings.filter((b) => b.id !== id),
      invoices: data.invoices.filter((i) => i.bookingId !== id),
    },
    null,
  );
}

// ---------- Payments ----------

export function addPayment(data: AppData, bookingId: string, input: PaymentInput): Outcome<Payment> {
  const booking = data.bookings.find((b) => b.id === bookingId);
  if (!booking) return fail("Booking not found.");
  if (booking.status === "Cancelled") return fail("Payments cannot be added to a cancelled booking.");
  if (!(input.amount > 0)) return fail("Payment amount must be greater than zero.");
  const { summary } = bookingSummary(data, booking);
  if (!data.settings.allowOverpayment && input.amount > summary.remaining + 0.001) {
    return fail(
      summary.remaining <= 0
        ? "This booking is already fully paid."
        : `Amount exceeds the outstanding balance of ${formatMoney(summary.remaining)}.`,
    );
  }
  const kind = input.kind ?? (summary.totalPaid > 0 ? "Additional" : "Advance");
  const { data: next, payment } = recordPayment(data, bookingId, input, kind);
  return done(next, payment);
}

export function voidPayment(data: AppData, paymentId: string, reason: string): Outcome<Payment> {
  if (!reason.trim()) return fail("A reason is required to void a payment.");
  const payment = data.payments.find((p) => p.id === paymentId);
  if (!payment) return fail("Payment not found.");
  if (payment.voided) return fail("Payment is already voided.");
  const updated: Payment = { ...payment, voided: { at: nowIso(), reason: reason.trim() } };
  return done({ ...data, payments: data.payments.map((p) => (p.id === paymentId ? updated : p)) }, updated);
}

// ---------- Invoices ----------

export function issueInvoice(data: AppData, bookingId: string, forceNew = false): Outcome<Invoice> {
  const booking = data.bookings.find((b) => b.id === bookingId);
  if (!booking) return fail("Booking not found.");
  const existing = data.invoices
    .filter((i) => i.bookingId === bookingId)
    .sort((a, b) => b.issuedAt.localeCompare(a.issuedAt))[0];
  if (existing && !forceNew) return done(data, existing);
  const { value, next } = uniqueNumber(
    (n) => `${data.settings.invoicePrefix}${pad(n, 5)}`,
    data.settings.nextInvoiceNumber,
    new Set(data.invoices.map((i) => i.invoiceNumber)),
  );
  const invoice: Invoice = {
    id: newId(),
    invoiceNumber: value,
    bookingId,
    issuedAt: nowIso(),
    amountAtIssue: bookingSummary(data, booking).totals.grandTotal,
  };
  return done(
    {
      ...data,
      invoices: [...data.invoices, invoice],
      settings: { ...data.settings, nextInvoiceNumber: next },
      // Link existing unlinked payments for this booking to the new invoice
      payments: data.payments.map((p) => (p.bookingId === bookingId && !p.invoiceId ? { ...p, invoiceId: invoice.id } : p)),
    },
    invoice,
  );
}

// ---------- Settings & data ----------

export function updateSettings(data: AppData, patch: Partial<Settings>): Outcome<Settings> {
  const settings = { ...data.settings, ...patch };
  return done({ ...data, settings }, settings);
}

export function importData(_data: AppData, incoming: AppData): Outcome<null> {
  const keys: (keyof AppData)[] = ["halls", "customers", "bookings", "payments", "invoices"];
  if (!incoming || typeof incoming !== "object" || !incoming.settings || keys.some((k) => !Array.isArray(incoming[k]))) {
    return fail("The selected file is not a valid backup.");
  }
  for (const k of keys) {
    const list = incoming[k] as { id?: unknown }[];
    if (list.some((x) => !x || typeof x !== "object" || typeof x.id !== "string")) {
      return fail(`The backup contains invalid ${k} records.`);
    }
  }
  return done(
    {
      settings: { ...defaultSettings, ...incoming.settings },
      halls: incoming.halls,
      customers: incoming.customers,
      bookings: incoming.bookings,
      payments: incoming.payments,
      invoices: incoming.invoices,
    },
    null,
  );
}

export function resetData(_data: AppData, withDemo: boolean): Outcome<null> {
  return done(withDemo ? demoData() : emptyData(), null);
}
