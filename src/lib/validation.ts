import { z } from "zod";
import { validateTimeRange } from "./schedule";
import { BOOKING_SOURCES, BOOKING_STATUSES, EVENT_TYPES, PAYMENT_METHODS } from "./types";

const phoneDigits = (v: string) => v.replace(/\D/g, "").length;

export const phoneSchema = z
  .string()
  .trim()
  .min(1, "Mobile number is required")
  .refine((v) => /^[+\d][\d\s-]*$/.test(v) && phoneDigits(v) >= 10 && phoneDigits(v) <= 13, {
    message: "Enter a valid mobile number, e.g. 0300-1234567",
  });

const optionalPhone = z
  .string()
  .trim()
  .refine((v) => v === "" || (/^[+\d][\d\s-]*$/.test(v) && phoneDigits(v) >= 10 && phoneDigits(v) <= 13), {
    message: "Enter a valid number or leave empty",
  });

export const customerSchema = z.object({
  name: z.string().trim().min(2, "Customer name is required").max(120),
  mobile: phoneSchema,
  whatsapp: optionalPhone,
  email: z.union([z.literal(""), z.email("Enter a valid email address")]),
  address: z.string().trim().min(3, "Address is required").max(300),
  cnic: z
    .string()
    .trim()
    .refine((v) => v === "" || /^\d{5}-?\d{7}-?\d$/.test(v), { message: "CNIC format: 12345-1234567-1" }),
  notes: z.string().max(2000),
});
export type CustomerFormValues = z.infer<typeof customerSchema>;

const money = z.number({ error: "Enter a number" }).min(0, "Cannot be negative");
const time = z.string().regex(/^\d{2}:\d{2}$/, "Select a time");
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Select a date");

const eventSchema = z.object({
  title: z.string().trim().min(2, "Event title is required").max(160),
  type: z.enum(EVENT_TYPES),
  date: z.string().min(1, "Event date is required").pipe(isoDate),
  startTime: time,
  endTime: time,
  overnight: z.boolean(),
  guests: z.number({ error: "Enter guest count" }).int("Whole number only").min(1, "At least 1 guest"),
  hallId: z.string().min(1, "Select a hall or marquee"),
  venueArea: z.string().max(120),
  organizer: z.string().max(120),
  specialInstructions: z.string().max(4000),
});

const chargesSchema = z.object({
  hallRent: money,
  cateringPerPerson: money,
  decoration: money,
  stage: money,
  lighting: money,
  sound: money,
  additional: money,
  additionalNote: z.string().max(300),
  discountPercent: money.max(100, "Max 100%"),
  taxPercent: money.max(100, "Max 100%"),
});

const advanceSchema = z.object({
  amount: money,
  date: z.string(),
  method: z.enum(PAYMENT_METHODS),
  reference: z.string().max(120),
});

const bookingBase = {
  customer: customerSchema,
  event: eventSchema,
  status: z.enum(BOOKING_STATUSES),
  source: z.enum(BOOKING_SOURCES),
  charges: chargesSchema,
};

const refineBooking = (
  v: { event: z.infer<typeof eventSchema>; advance?: z.infer<typeof advanceSchema> },
  ctx: z.RefinementCtx,
) => {
  const err = validateTimeRange(v.event.startTime, v.event.endTime, v.event.overnight);
  if (err) ctx.addIssue({ code: "custom", path: ["event", "endTime"], message: err });
  if (v.advance && v.advance.amount > 0 && !/^\d{4}-\d{2}-\d{2}$/.test(v.advance.date)) {
    ctx.addIssue({ code: "custom", path: ["advance", "date"], message: "Payment date is required" });
  }
};

/** Booking form: every field present, empty strings for blanks. */
export const bookingSchema = z
  .object({
    ...bookingBase,
    customerId: z.string(),
    notes: z.string(),
    advance: advanceSchema,
  })
  .superRefine(refineBooking);
export type BookingFormValues = z.infer<typeof bookingSchema>;

/** API body for creating/updating a booking. */
export const bookingInputSchema = z
  .object({
    ...bookingBase,
    customerId: z.string().optional(),
    notes: z.string().max(4000).optional(),
    advance: advanceSchema.optional(),
  })
  .superRefine(refineBooking);

export const paymentSchema = z.object({
  amount: z.number({ error: "Enter an amount" }).positive("Amount must be greater than zero"),
  date: z.string().min(1, "Payment date is required").pipe(isoDate),
  method: z.enum(PAYMENT_METHODS),
  kind: z.enum(["Advance", "Additional"]),
  reference: z.string().max(120),
  note: z.string().max(500),
});
export type PaymentFormValues = z.infer<typeof paymentSchema>;

export const paymentInputSchema = paymentSchema.extend({
  kind: z.enum(["Advance", "Additional"]).optional(),
  reference: z.string().max(120).optional(),
  note: z.string().max(500).optional(),
});

export const hallInputSchema = z.object({
  name: z.string().trim().min(2, "Hall name is required").max(120),
  areas: z.array(z.string().trim().min(1).max(80)).max(30),
  capacity: z.number().int().min(1, "Capacity must be at least 1"),
  baseRent: z.number().min(0, "Cannot be negative"),
  location: z.string().max(200).optional(),
  description: z.string().max(1000).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Invalid colour"),
  active: z.boolean(),
});

export const statusInputSchema = z.object({
  status: z.enum(BOOKING_STATUSES),
  note: z.string().max(500).optional(),
});

export const voidInputSchema = z.object({ reason: z.string().trim().min(1, "A reason is required").max(500) });

export const settingsSchema = z.object({
  businessName: z.string().trim().min(2, "Business name is required").max(120),
  tagline: z.string().max(160),
  logo: z
    .string()
    .max(1_000_000, "Logo is too large")
    .refine((v) => v.startsWith("data:image/"), "Logo must be an image")
    .optional(),
  phone: z.string().trim().min(5, "Phone is required").max(40),
  email: z.union([z.literal(""), z.email("Enter a valid email")]),
  website: z.string().max(160),
  address: z.string().trim().min(3, "Address is required").max(300),
  ntn: z.string().max(40).optional(),
  currency: z.string().trim().min(1, "Currency is required").max(5),
  bookingPrefix: z.string().max(10),
  nextBookingNumber: z.number().int().min(1),
  invoicePrefix: z.string().max(10),
  nextInvoiceNumber: z.number().int().min(1),
  receiptPrefix: z.string().max(10),
  nextReceiptNumber: z.number().int().min(1),
  taxEnabled: z.boolean(),
  defaultTaxPercent: z.number().min(0).max(100, "Max 100%"),
  maxDiscountPercent: z.number().min(0).max(100, "Max 100%"),
  allowOverpayment: z.boolean(),
  invoiceFooter: z.string().max(500),
  bookingTerms: z.string().max(5000),
  cancellationPolicy: z.string().max(5000),
});
export type SettingsValues = z.infer<typeof settingsSchema>;

export const loginSchema = z.object({
  username: z.string().trim().min(1, "Username is required").max(100),
  password: z.string().min(1, "Password is required").max(200),
});
export type LoginValues = z.infer<typeof loginSchema>;
