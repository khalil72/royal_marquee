export const EVENT_TYPES = [
  "Wedding",
  "Barat",
  "Walima",
  "Mehndi",
  "Engagement",
  "Birthday",
  "Corporate Event",
  "Other",
] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export const BOOKING_STATUSES = ["Pending", "Confirmed", "Completed", "Cancelled"] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const PAYMENT_STATUSES = ["Unpaid", "Partially Paid", "Paid"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const BOOKING_SOURCES = ["Walk-in", "Phone", "WhatsApp", "Website", "Other"] as const;
export type BookingSource = (typeof BOOKING_SOURCES)[number];

export const PAYMENT_METHODS = ["Cash", "Bank Transfer", "JazzCash", "Easypaisa", "Other"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export interface Customer {
  id: string;
  name: string;
  mobile: string;
  whatsapp?: string;
  email?: string;
  address: string;
  cnic?: string;
  notes?: string;
  createdAt: string;
}

/** A separately bookable part of a hall, e.g. "Portion A". */
export interface HallPortion {
  id: string;
  name: string;
  capacity: number;
  rent: number;
  /** Unavailable portions keep their bookings but cannot take new ones */
  active: boolean;
}

export interface Hall {
  id: string;
  name: string;
  /** Sub-areas such as "Main Hall", "Lawn", "Rooftop" */
  areas: string[];
  /** Total capacity of the whole hall */
  capacity: number;
  /** Rent for booking the full hall */
  baseRent: number;
  location?: string;
  description?: string;
  color: string;
  active: boolean;
  createdAt: string;
  /** Hall can be split into independently bookable portions. Missing on older records. */
  divided?: boolean;
  /** When divided, whether the whole hall can still be booked at once. Defaults to true. */
  allowFullBooking?: boolean;
  portions?: HallPortion[];
}

export interface EventDetails {
  title: string;
  type: EventType;
  /** yyyy-MM-dd */
  date: string;
  /** HH:mm (24h) */
  startTime: string;
  /** HH:mm (24h) */
  endTime: string;
  /** End time falls on the following day */
  overnight: boolean;
  guests: number;
  hallId: string;
  /** Booked portion of a divided hall; empty means the full hall */
  portionId?: string;
  venueArea?: string;
  organizer?: string;
  specialInstructions?: string;
}

export interface Charges {
  hallRent: number;
  cateringPerPerson: number;
  decoration: number;
  stage: number;
  lighting: number;
  sound: number;
  additional: number;
  additionalNote?: string;
  discountPercent: number;
  taxPercent: number;
}

export interface Booking {
  id: string;
  bookingNumber: string;
  createdAt: string;
  updatedAt: string;
  customerId: string;
  event: EventDetails;
  status: BookingStatus;
  source: BookingSource;
  charges: Charges;
  notes?: string;
  statusHistory: { status: BookingStatus; at: string; note?: string }[];
}

export interface Payment {
  id: string;
  receiptNumber: string;
  bookingId: string;
  invoiceId?: string;
  kind: "Advance" | "Additional";
  /** yyyy-MM-dd */
  date: string;
  amount: number;
  method: PaymentMethod;
  reference?: string;
  note?: string;
  createdAt: string;
  /** Payments are never deleted: they are voided with a reason */
  voided?: { at: string; reason: string };
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  bookingId: string;
  issuedAt: string;
  /** Grand total at the moment the invoice was issued */
  amountAtIssue: number;
}

export interface Settings {
  businessName: string;
  tagline: string;
  logo?: string;
  phone: string;
  email: string;
  website: string;
  address: string;
  ntn?: string;
  currency: string;
  bookingPrefix: string;
  nextBookingNumber: number;
  invoicePrefix: string;
  nextInvoiceNumber: number;
  receiptPrefix: string;
  nextReceiptNumber: number;
  taxEnabled: boolean;
  defaultTaxPercent: number;
  maxDiscountPercent: number;
  allowOverpayment: boolean;
  invoiceFooter: string;
  bookingTerms: string;
  cancellationPolicy: string;
}

export interface AppData {
  settings: Settings;
  halls: Hall[];
  customers: Customer[];
  bookings: Booking[];
  payments: Payment[];
  invoices: Invoice[];
}
