import { addDays, format, subDays } from "date-fns";
import { calculateTotals } from "./calc";
import type { AppData, Booking, Customer, Hall, Invoice, Payment, Settings } from "./types";

export const defaultSettings: Settings = {
  businessName: "Royal Nikah Marquee",
  tagline: "Marquee & Banquet Halls",
  phone: "+92 300 1234567",
  email: "bookings@royalnikah.pk",
  website: "www.royalnikah.pk",
  address: "Main Canal Road, Lahore, Pakistan",
  ntn: "",
  currency: "PKR",
  bookingPrefix: "BK-",
  nextBookingNumber: 1,
  invoicePrefix: "INV-",
  nextInvoiceNumber: 1,
  receiptPrefix: "RCPT-",
  nextReceiptNumber: 1,
  taxEnabled: true,
  defaultTaxPercent: 0,
  maxDiscountPercent: 25,
  allowOverpayment: false,
  invoiceFooter: "Thank you for choosing us to host your special occasion.",
  bookingTerms: [
    "A minimum advance of 25% is required to confirm the booking.",
    "Remaining balance must be cleared 3 days before the event date.",
    "Guest count may be revised up to 5 days before the event; catering is charged on the final count.",
    "Any damage to the property will be charged to the customer.",
    "The venue must be vacated at the scheduled end time; extra time is charged per hour.",
  ].join("\n"),
  cancellationPolicy: [
    "Cancellation 30+ days before the event: 75% of advance refunded.",
    "Cancellation 15–29 days before the event: 50% of advance refunded.",
    "Cancellation less than 15 days before the event: advance is non-refundable.",
  ].join("\n"),
};

export function emptyData(): AppData {
  return {
    settings: { ...defaultSettings },
    halls: [],
    customers: [],
    bookings: [],
    payments: [],
    invoices: [],
  };
}

const id = () => crypto.randomUUID();
const pad = (n: number, w: number) => String(n).padStart(w, "0");

/** Demo data relative to today so the dashboard and calendar look alive. */
export function demoData(): AppData {
  const now = new Date();
  const iso = now.toISOString();
  const day = (offset: number) => format(offset >= 0 ? addDays(now, offset) : subDays(now, -offset), "yyyy-MM-dd");

  const halls: Hall[] = [
    {
      id: id(),
      name: "Royal Palace Marquee",
      areas: ["Main Marquee", "Garden Lawn"],
      capacity: 800,
      baseRent: 250000,
      location: "Block A",
      description: "Air-conditioned marquee with attached lawn and bridal room.",
      color: "#7c3aed",
      active: true,
      createdAt: iso,
    },
    {
      id: id(),
      name: "Emerald Banquet Hall",
      areas: ["Hall A", "Hall B"],
      capacity: 500,
      baseRent: 180000,
      location: "Block B, First Floor",
      description: "Indoor banquet hall, ideal for walima and corporate dinners.",
      color: "#059669",
      active: true,
      createdAt: iso,
    },
    {
      id: id(),
      name: "Crystal Lawn",
      areas: ["Open Lawn"],
      capacity: 1200,
      baseRent: 300000,
      location: "Rear side",
      description: "Open-air lawn for mehndi and large gatherings.",
      color: "#d97706",
      active: true,
      createdAt: iso,
    },
  ];

  const people: [string, string, string][] = [
    ["Muhammad Usman", "0300-1112233", "House 12, Johar Town, Lahore"],
    ["Ayesha Siddiqui", "0321-4455667", "Flat 5, Gulberg III, Lahore"],
    ["Hamza Tariq", "0333-7788990", "Street 4, DHA Phase 5, Lahore"],
    ["Fatima Noor", "0345-2233445", "Model Town Extension, Lahore"],
    ["TechNova Pvt Ltd", "0301-9988776", "Arfa Tower, Ferozepur Road, Lahore"],
    ["Zainab Ali", "0312-6677889", "Bahria Town, Sector C, Lahore"],
  ];
  const customers: Customer[] = people.map(([name, mobile, address]) => ({
    id: id(),
    name,
    mobile,
    whatsapp: mobile,
    email: "",
    address,
    cnic: "",
    notes: "",
    createdAt: iso,
  }));

  type Spec = {
    c: number;
    h: number;
    title: string;
    type: Booking["event"]["type"];
    d: number;
    s: string;
    e: string;
    on?: boolean;
    g: number;
    pp: number;
    status: Booking["status"];
    paid: number[];
    area?: string;
  };
  const specs: Spec[] = [
    { c: 0, h: 0, title: "Usman & Hira Barat", type: "Barat", d: 0, s: "19:00", e: "23:30", g: 450, pp: 1800, status: "Confirmed", paid: [300000, 200000], area: "Main Marquee" },
    { c: 1, h: 2, title: "Ayesha's Mehndi Night", type: "Mehndi", d: 0, s: "20:00", e: "01:00", on: true, g: 300, pp: 1500, status: "Confirmed", paid: [250000] },
    { c: 2, h: 1, title: "Hamza Walima Reception", type: "Walima", d: 2, s: "13:00", e: "16:00", g: 350, pp: 2000, status: "Confirmed", paid: [400000], area: "Hall A" },
    { c: 3, h: 0, title: "Fatima Engagement", type: "Engagement", d: 4, s: "18:00", e: "22:00", g: 150, pp: 1700, status: "Pending", paid: [], area: "Garden Lawn" },
    { c: 4, h: 1, title: "TechNova Annual Dinner", type: "Corporate Event", d: 6, s: "19:30", e: "23:00", g: 220, pp: 2500, status: "Confirmed", paid: [300000], area: "Hall B" },
    { c: 5, h: 2, title: "Zainab's Wedding", type: "Wedding", d: 10, s: "18:00", e: "23:59", g: 900, pp: 1900, status: "Pending", paid: [150000] },
    { c: 0, h: 1, title: "Usman Family Walima", type: "Walima", d: 1, s: "12:30", e: "15:30", g: 400, pp: 2000, status: "Confirmed", paid: [500000, 300000], area: "Hall A" },
    { c: 3, h: 0, title: "Noor Birthday Celebration", type: "Birthday", d: -5, s: "17:00", e: "20:00", g: 80, pp: 1600, status: "Completed", paid: [100000, 249600], area: "Garden Lawn" },
    { c: 2, h: 2, title: "Tariq Mehndi", type: "Mehndi", d: -12, s: "20:00", e: "00:30", on: true, g: 250, pp: 1500, status: "Completed", paid: [300000, 375000] },
    { c: 1, h: 1, title: "Siddiqui Engagement", type: "Engagement", d: -3, s: "18:00", e: "21:00", g: 120, pp: 1800, status: "Cancelled", paid: [] },
  ];

  const bookings: Booking[] = [];
  const payments: Payment[] = [];
  const invoices: Invoice[] = [];
  let receipt = 1;
  const year = now.getFullYear();

  specs.forEach((s, i) => {
    const hall = halls[s.h];
    const createdAt = subDays(now, 30 - i * 2).toISOString();
    const charges = {
      hallRent: hall.baseRent,
      cateringPerPerson: s.pp,
      decoration: 60000 + i * 5000,
      stage: 35000,
      lighting: 25000,
      sound: 20000,
      additional: 0,
      additionalNote: "",
      discountPercent: i % 3 === 0 ? 5 : 0,
      taxPercent: 0,
    };
    const booking: Booking = {
      id: id(),
      bookingNumber: `BK-${year}-${pad(i + 1, 4)}`,
      createdAt,
      updatedAt: createdAt,
      customerId: customers[s.c].id,
      event: {
        title: s.title,
        type: s.type,
        date: day(s.d),
        startTime: s.s,
        endTime: s.e,
        overnight: !!s.on,
        guests: s.g,
        hallId: hall.id,
        venueArea: s.area ?? hall.areas[0],
        organizer: people[s.c][0],
        specialInstructions: "",
      },
      status: s.status,
      source: (["Walk-in", "Phone", "WhatsApp", "Website"] as const)[i % 4],
      charges,
      notes: "",
      statusHistory: [{ status: s.status, at: createdAt }],
    };
    bookings.push(booking);

    const { grandTotal } = calculateTotals(charges, s.g);
    let invoiceId: string | undefined;
    if (s.status !== "Pending" && s.status !== "Cancelled") {
      invoiceId = id();
      invoices.push({
        id: invoiceId,
        invoiceNumber: `INV-${pad(invoices.length + 1, 5)}`,
        bookingId: booking.id,
        issuedAt: createdAt,
        amountAtIssue: grandTotal,
      });
    }
    // Completed events are settled in full; others never exceed the total
    let remaining = grandTotal;
    const amounts = s.paid.map((amount, k) => {
      const value = s.status === "Completed" && k === s.paid.length - 1 ? remaining : Math.min(amount, remaining);
      remaining -= value;
      return value;
    });
    amounts.forEach((amount, k) => {
      payments.push({
        id: id(),
        receiptNumber: `RCPT-${pad(receipt++, 5)}`,
        bookingId: booking.id,
        invoiceId,
        kind: k === 0 ? "Advance" : "Additional",
        date: format(addDays(new Date(createdAt), k * 7), "yyyy-MM-dd"),
        amount,
        method: (["Cash", "Bank Transfer", "JazzCash", "Easypaisa"] as const)[(i + k) % 4],
        reference: k === 0 ? "" : `TRX${100200 + i * 10 + k}`,
        note: "",
        createdAt,
      });
    });
  });

  return {
    settings: {
      ...defaultSettings,
      nextBookingNumber: bookings.length + 1,
      nextInvoiceNumber: invoices.length + 1,
      nextReceiptNumber: receipt,
    },
    halls,
    customers,
    bookings,
    payments,
    invoices,
  };
}
