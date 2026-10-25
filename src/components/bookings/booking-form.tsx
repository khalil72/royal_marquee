"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Controller, useForm, useWatch, type FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import {
  CalendarClock,
  ClipboardList,
  Clock,
  LoaderCircle,
  Moon,
  Receipt,
  Save,
  TriangleAlert,
  UserRound,
  Wallet,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Combobox } from "@/components/shared/combobox";
import { DatePicker } from "@/components/shared/date-picker";
import { FormField, MoneyInput, SectionCard, numberValue } from "@/components/shared/form-field";
import { PaymentBadge } from "@/components/shared/status-badge";
import { calculateTotals, paymentStatusFor, summarizePayments } from "@/lib/calc";
import { formatDate, formatDuration, formatMoney } from "@/lib/format";
import { eventDurationMinutes, findConflicts, validateTimeRange } from "@/lib/schedule";
import { useStore, type BookingInput } from "@/lib/store";
import { bookingSchema, type BookingFormValues } from "@/lib/validation";
import {
  BOOKING_SOURCES,
  BOOKING_STATUSES,
  EVENT_TYPES,
  PAYMENT_METHODS,
  type Booking,
  type Customer,
} from "@/lib/types";
import { AvailabilityAlert } from "./availability-alert";
import { CustomerPicker } from "./customer-picker";
import { PricingBreakdown } from "./pricing-breakdown";

const NONE = "__none__";
const inputCls = "h-9";

function firstError(errors: FieldErrors): string | undefined {
  for (const value of Object.values(errors)) {
    if (!value) continue;
    if (typeof value.message === "string") return value.message;
    const nested = firstError(value as FieldErrors);
    if (nested) return nested;
  }
}

export function BookingForm({
  booking,
  initialDate,
  initialHallId,
  initialStart,
  initialCustomerId,
}: {
  booking?: Booking;
  initialDate?: string;
  initialHallId?: string;
  initialStart?: string;
  initialCustomerId?: string;
}) {
  const router = useRouter();
  const isEdit = !!booking;
  const settings = useStore((s) => s.settings);
  const halls = useStore((s) => s.halls);
  const customers = useStore((s) => s.customers);
  const bookings = useStore((s) => s.bookings);
  const allPayments = useStore((s) => s.payments);
  const createBooking = useStore((s) => s.createBooking);
  const updateBooking = useStore((s) => s.updateBooking);
  const [submitting, setSubmitting] = useState(false);

  const defaultValues = useMemo<BookingFormValues>(() => {
    const today = format(new Date(), "yyyy-MM-dd");
    if (booking) {
      const c = customers.find((x) => x.id === booking.customerId);
      return {
        customerId: booking.customerId,
        customer: {
          name: c?.name ?? "",
          mobile: c?.mobile ?? "",
          whatsapp: c?.whatsapp ?? "",
          email: c?.email ?? "",
          address: c?.address ?? "",
          cnic: c?.cnic ?? "",
          notes: c?.notes ?? "",
        },
        event: {
          ...booking.event,
          venueArea: booking.event.venueArea ?? "",
          organizer: booking.event.organizer ?? "",
          specialInstructions: booking.event.specialInstructions ?? "",
        },
        status: booking.status,
        source: booking.source,
        charges: { ...booking.charges, additionalNote: booking.charges.additionalNote ?? "" },
        notes: booking.notes ?? "",
        advance: { amount: 0, date: today, method: "Cash", reference: "" },
      };
    }
    const hall = halls.find((h) => h.id === initialHallId && h.active);
    const preset = customers.find((c) => c.id === initialCustomerId);
    const start = initialStart ?? "19:00";
    const [sh] = start.split(":").map(Number);
    const endHour = (sh + 4) % 24;
    return {
      customerId: preset?.id ?? "",
      customer: {
        name: preset?.name ?? "",
        mobile: preset?.mobile ?? "",
        whatsapp: preset?.whatsapp ?? "",
        email: preset?.email ?? "",
        address: preset?.address ?? "",
        cnic: preset?.cnic ?? "",
        notes: preset?.notes ?? "",
      },
      event: {
        title: "",
        type: "Wedding",
        date: initialDate ?? "",
        startTime: start,
        endTime: `${String(endHour).padStart(2, "0")}:${start.split(":")[1] ?? "00"}`,
        overnight: sh + 4 >= 24,
        guests: 0,
        hallId: hall?.id ?? "",
        venueArea: hall?.areas[0] ?? "",
        organizer: preset?.name ?? "",
        specialInstructions: "",
      },
      status: "Pending",
      source: "Walk-in",
      charges: {
        hallRent: hall?.baseRent ?? 0,
        cateringPerPerson: 0,
        decoration: 0,
        stage: 0,
        lighting: 0,
        sound: 0,
        additional: 0,
        additionalNote: "",
        discountPercent: 0,
        taxPercent: settings.taxEnabled ? settings.defaultTaxPercent : 0,
      },
      notes: "",
      advance: { amount: 0, date: today, method: "Cash", reference: "" },
    };
    // Defaults are computed once per mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingSchema),
    defaultValues,
    mode: "onTouched",
  });
  const {
    register,
    control,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors },
  } = form;

  const values = useWatch({ control }) as BookingFormValues;
  const { event, charges, status, customerId, advance } = values;

  const hall = halls.find((h) => h.id === event.hallId);
  const totals = calculateTotals(charges, event.guests);
  const timeError = validateTimeRange(event.startTime, event.endTime, event.overnight);
  const duration = timeError ? 0 : eventDurationMinutes(event.startTime, event.endTime, event.overnight);
  const conflicts = useMemo(
    () => findConflicts(event, status, bookings, booking?.id),
    [event, status, bookings, booking?.id],
  );
  const availabilityReady = !!(event.hallId && event.date && event.startTime && event.endTime && !timeError);

  const existingPayments = useMemo(
    () => (booking ? allPayments.filter((p) => p.bookingId === booking.id) : []),
    [allPayments, booking],
  );
  const summary = isEdit
    ? summarizePayments(totals.grandTotal, existingPayments)
    : summarizePayments(
        totals.grandTotal,
        (advance?.amount ?? 0) > 0
          ? [
              {
                id: "preview",
                receiptNumber: "",
                bookingId: "",
                kind: "Advance",
                date: advance.date,
                amount: advance.amount,
                method: advance.method,
                createdAt: "",
              },
            ]
          : [],
      );
  const paymentStatus = paymentStatusFor(totals.grandTotal, summary.totalPaid);
  const overCapacity = hall && event.guests > hall.capacity;
  const advanceTooHigh = !isEdit && !settings.allowOverpayment && (advance?.amount ?? 0) > totals.grandTotal;

  // When the hall changes, pre-fill its base rent unless the user typed a custom amount
  const prevHallId = useRef(event.hallId);
  useEffect(() => {
    if (prevHallId.current === event.hallId) return;
    const prev = halls.find((h) => h.id === prevHallId.current);
    const next = halls.find((h) => h.id === event.hallId);
    prevHallId.current = event.hallId;
    if (!next) return;
    const rent = getValues("charges.hallRent");
    if (!rent || (prev && rent === prev.baseRent)) setValue("charges.hallRent", next.baseRent);
    if (!next.areas.includes(getValues("event.venueArea"))) setValue("event.venueArea", next.areas[0] ?? "");
  }, [event.hallId, halls, getValues, setValue]);

  const selectCustomer = (c: Customer) => {
    setValue("customerId", c.id);
    setValue(
      "customer",
      {
        name: c.name,
        mobile: c.mobile,
        whatsapp: c.whatsapp ?? "",
        email: c.email ?? "",
        address: c.address,
        cnic: c.cnic ?? "",
        notes: c.notes ?? "",
      },
      { shouldValidate: true },
    );
    if (!getValues("event.organizer")) setValue("event.organizer", c.name);
  };

  const clearCustomer = () => {
    setValue("customerId", "");
    setValue("customer", { name: "", mobile: "", whatsapp: "", email: "", address: "", cnic: "", notes: "" });
  };

  const onSubmit = async (v: BookingFormValues) => {
    if (conflicts.blocking.length) {
      toast.error("This hall is already booked for the selected time.");
      return;
    }
    if (advanceTooHigh) {
      toast.error("Advance payment cannot exceed the grand total.");
      return;
    }
    setSubmitting(true);
    const input: BookingInput = {
      customerId: v.customerId || undefined,
      customer: v.customer,
      event: v.event,
      status: v.status,
      source: v.source,
      charges: v.charges,
      notes: v.notes,
      advance: !isEdit && v.advance.amount > 0 ? v.advance : undefined,
    };
    const result = await (isEdit ? updateBooking(booking.id, input) : createBooking(input));
    setSubmitting(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(isEdit ? "Booking updated" : `Booking ${result.data.bookingNumber} created`);
    router.push(`/bookings/${result.data.id}`);
  };

  const onInvalid = (errs: FieldErrors<BookingFormValues>) => {
    toast.error(firstError(errs) ?? "Please fix the highlighted fields.");
  };

  const hallOptions = halls
    .filter((h) => h.active || h.id === booking?.event.hallId)
    .map((h) => ({
      value: h.id,
      label: h.name,
      description: `Capacity ${h.capacity} · Rent ${formatMoney(h.baseRent, settings.currency)}${h.active ? "" : " · Inactive"}`,
    }));

  const nextNumberPreview = `${settings.bookingPrefix}${new Date().getFullYear()}-${String(settings.nextBookingNumber).padStart(4, "0")}`;
  const cur = settings.currency;

  return (
    <form onSubmit={handleSubmit(onSubmit, onInvalid)} noValidate className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="space-y-6">
        {/* A. Customer */}
        <SectionCard
          icon={UserRound}
          title="Customer Details"
          description={customerId ? "Linked to an existing customer — edits update their record." : "Search an existing customer or enter a new one."}
          action={
            <div className="flex items-center gap-2">
              {customerId && (
                <Button type="button" variant="ghost" size="sm" onClick={clearCustomer}>
                  <X /> New customer
                </Button>
              )}
              <CustomerPicker onSelect={selectCustomer} />
            </div>
          }
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Customer full name" htmlFor="c-name" required error={errors.customer?.name?.message}>
              <Input id="c-name" className={inputCls} placeholder="e.g. Muhammad Ali" aria-invalid={!!errors.customer?.name} {...register("customer.name")} />
            </FormField>
            <FormField label="Mobile number" htmlFor="c-mobile" required error={errors.customer?.mobile?.message}>
              <Input id="c-mobile" className={inputCls} inputMode="tel" placeholder="0300-1234567" aria-invalid={!!errors.customer?.mobile} {...register("customer.mobile")} />
            </FormField>
            <FormField label="WhatsApp number" htmlFor="c-wa" error={errors.customer?.whatsapp?.message} hint="Optional">
              <div className="flex gap-2">
                <Input id="c-wa" className={inputCls} inputMode="tel" placeholder="Same as mobile?" aria-invalid={!!errors.customer?.whatsapp} {...register("customer.whatsapp")} />
                <Button type="button" variant="outline" className="h-9 shrink-0" onClick={() => setValue("customer.whatsapp", getValues("customer.mobile"), { shouldValidate: true })}>
                  Copy mobile
                </Button>
              </div>
            </FormField>
            <FormField label="Email address" htmlFor="c-email" error={errors.customer?.email?.message} hint="Optional">
              <Input id="c-email" type="email" className={inputCls} placeholder="name@example.com" aria-invalid={!!errors.customer?.email} {...register("customer.email")} />
            </FormField>
            <FormField label="Customer address" htmlFor="c-address" required error={errors.customer?.address?.message} className="sm:col-span-2">
              <Input id="c-address" className={inputCls} placeholder="House, street, area, city" aria-invalid={!!errors.customer?.address} {...register("customer.address")} />
            </FormField>
            <FormField label="CNIC number" htmlFor="c-cnic" error={errors.customer?.cnic?.message} hint="Optional · 12345-1234567-1">
              <Input id="c-cnic" className={inputCls} placeholder="35202-1234567-1" aria-invalid={!!errors.customer?.cnic} {...register("customer.cnic")} />
            </FormField>
            <FormField label="Customer notes" htmlFor="c-notes">
              <Input id="c-notes" className={inputCls} placeholder="Preferences, reference, etc." {...register("customer.notes")} />
            </FormField>
          </div>
        </SectionCard>

        {/* B. Event */}
        <SectionCard icon={CalendarClock} title="Event Details" description="Schedule, venue and guest information.">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Event name / title" htmlFor="e-title" required error={errors.event?.title?.message} className="sm:col-span-2">
              <Input id="e-title" className={inputCls} placeholder="e.g. Ali & Sara Barat" aria-invalid={!!errors.event?.title} {...register("event.title")} />
            </FormField>
            <FormField label="Event type" required>
              <Controller
                control={control}
                name="event.type"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="h-9! w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {EVENT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
            <FormField label="Event date" htmlFor="e-date" required error={errors.event?.date?.message}>
              <Controller
                control={control}
                name="event.date"
                render={({ field }) => (
                  <DatePicker id="e-date" value={field.value} onChange={(v) => field.onChange(v)} invalid={!!errors.event?.date} />
                )}
              />
            </FormField>
            <FormField label="Start time" htmlFor="e-start" required error={errors.event?.startTime?.message}>
              <Input id="e-start" type="time" step={300} className={inputCls} aria-invalid={!!errors.event?.startTime} {...register("event.startTime", { deps: ["event.endTime"] })} />
            </FormField>
            <FormField label="End time" htmlFor="e-end" required error={errors.event?.endTime?.message}>
              <Input id="e-end" type="time" step={300} className={inputCls} aria-invalid={!!errors.event?.endTime} {...register("event.endTime")} />
            </FormField>
            <div className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-3 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between">
              <label className="flex items-center gap-3 text-sm">
                <Controller
                  control={control}
                  name="event.overnight"
                  render={({ field }) => (
                    <Switch
                      checked={field.value}
                      onCheckedChange={(c) => {
                        field.onChange(c);
                        void form.trigger("event.endTime");
                      }}
                    />
                  )}
                />
                <span className="flex items-center gap-1.5">
                  <Moon className="size-4 text-muted-foreground" /> Ends next day (continues past midnight)
                </span>
              </label>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="size-4 text-muted-foreground" />
                <span className="text-muted-foreground">Total duration:</span>
                <span className="font-semibold">{formatDuration(duration)}</span>
              </div>
            </div>
            {timeError && !event.overnight && event.endTime < event.startTime && (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-sm sm:col-span-2">
                <span>End time is before start time. Does this event run past midnight?</span>
                <Button type="button" size="sm" variant="outline" onClick={() => { setValue("event.overnight", true); void form.trigger("event.endTime"); }}>
                  Yes, ends next day
                </Button>
              </div>
            )}
            <FormField label="Marquee / hall" htmlFor="e-hall" required error={errors.event?.hallId?.message}>
              <Controller
                control={control}
                name="event.hallId"
                render={({ field }) => (
                  <Combobox
                    id="e-hall"
                    options={hallOptions}
                    value={field.value}
                    onChange={(v) => field.onChange(v)}
                    placeholder="Select hall"
                    searchPlaceholder="Search halls…"
                    invalid={!!errors.event?.hallId}
                  />
                )}
              />
              {hallOptions.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No active halls yet.{" "}
                  <Link href="/halls" className="text-primary underline underline-offset-2">Add a hall</Link> first.
                </p>
              )}
            </FormField>
            <FormField label="Hall / venue area" htmlFor="e-area">
              {hall && hall.areas.length > 0 ? (
                <Controller
                  control={control}
                  name="event.venueArea"
                  render={({ field }) => (
                    <Select value={field.value || NONE} onValueChange={(v) => field.onChange(v === NONE ? "" : v)}>
                      <SelectTrigger id="e-area" className="h-9! w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE}>Entire venue</SelectItem>
                        {hall.areas.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                />
              ) : (
                <Input id="e-area" className={inputCls} placeholder="e.g. Main hall, Lawn" {...register("event.venueArea")} />
              )}
            </FormField>
            <FormField
              label="Expected guests"
              htmlFor="e-guests"
              required
              error={errors.event?.guests?.message}
              hint={overCapacity ? undefined : hall ? `Hall capacity: ${hall.capacity}` : undefined}
            >
              <Input id="e-guests" type="number" min={1} inputMode="numeric" className={inputCls} aria-invalid={!!errors.event?.guests} {...register("event.guests", { setValueAs: numberValue })} />
              {overCapacity && (
                <p className="flex items-center gap-1 text-xs text-amber-700 dark:text-amber-300">
                  <TriangleAlert className="size-3.5" /> Exceeds hall capacity of {hall.capacity}
                </p>
              )}
            </FormField>
            <FormField label="Organizer / contact person" htmlFor="e-org">
              <Input id="e-org" className={inputCls} placeholder="Who to contact on the day" {...register("event.organizer")} />
            </FormField>
            <FormField label="Special instructions" htmlFor="e-instr" className="sm:col-span-2">
              <Textarea id="e-instr" rows={3} placeholder="Menu notes, décor theme, separate seating, etc." {...register("event.specialInstructions")} />
            </FormField>
          </div>
        </SectionCard>

        {/* C. Booking */}
        <SectionCard icon={ClipboardList} title="Booking Details">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <FormField label="Booking number" hint="Generated automatically">
              <Input className={`${inputCls} bg-muted/50 font-mono`} readOnly value={booking?.bookingNumber ?? nextNumberPreview} />
            </FormField>
            <FormField label="Booking creation date">
              <Input className={`${inputCls} bg-muted/50`} readOnly value={formatDate(booking?.createdAt ?? new Date().toISOString())} />
            </FormField>
            <FormField label="Booking status" required>
              <Controller
                control={control}
                name="status"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="h-9! w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {BOOKING_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
            <FormField label="Payment status" hint="Updates automatically from payments">
              <div className="flex h-9 items-center"><PaymentBadge status={paymentStatus} /></div>
            </FormField>
            <FormField label="Booking source" required>
              <Controller
                control={control}
                name="source"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="h-9! w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {BOOKING_SOURCES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
            <FormField label="Internal booking notes" htmlFor="b-notes" className="sm:col-span-2 lg:col-span-3">
              <Textarea id="b-notes" rows={2} placeholder="Private notes, not shown on invoices" {...register("notes")} />
            </FormField>
          </div>
        </SectionCard>

        {/* Pricing */}
        <SectionCard icon={Receipt} title="Charges & Pricing" description="Totals recalculate as you type.">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <FormField label="Hall rental charges" htmlFor="p-hall" error={errors.charges?.hallRent?.message}>
              <MoneyInput id="p-hall" prefix={cur} invalid={!!errors.charges?.hallRent} {...register("charges.hallRent", { setValueAs: numberValue })} />
            </FormField>
            <FormField
              label="Catering per person"
              htmlFor="p-cat"
              error={errors.charges?.cateringPerPerson?.message}
              hint={`${event.guests || 0} × ${formatMoney(charges.cateringPerPerson || 0, cur)} = ${formatMoney(totals.catering, cur)}`}
            >
              <MoneyInput id="p-cat" prefix={cur} invalid={!!errors.charges?.cateringPerPerson} {...register("charges.cateringPerPerson", { setValueAs: numberValue })} />
            </FormField>
            <FormField label="Decoration charges" htmlFor="p-deco" error={errors.charges?.decoration?.message}>
              <MoneyInput id="p-deco" prefix={cur} {...register("charges.decoration", { setValueAs: numberValue })} />
            </FormField>
            <FormField label="Stage setup charges" htmlFor="p-stage" error={errors.charges?.stage?.message}>
              <MoneyInput id="p-stage" prefix={cur} {...register("charges.stage", { setValueAs: numberValue })} />
            </FormField>
            <FormField label="Lighting charges" htmlFor="p-light" error={errors.charges?.lighting?.message}>
              <MoneyInput id="p-light" prefix={cur} {...register("charges.lighting", { setValueAs: numberValue })} />
            </FormField>
            <FormField label="Sound system charges" htmlFor="p-sound" error={errors.charges?.sound?.message}>
              <MoneyInput id="p-sound" prefix={cur} {...register("charges.sound", { setValueAs: numberValue })} />
            </FormField>
            <FormField label="Additional services" htmlFor="p-add" error={errors.charges?.additional?.message}>
              <MoneyInput id="p-add" prefix={cur} {...register("charges.additional", { setValueAs: numberValue })} />
            </FormField>
            <FormField label="Additional services description" htmlFor="p-add-note" className="lg:col-span-2">
              <Input id="p-add-note" className={inputCls} placeholder="e.g. Fireworks, valet parking, photography" {...register("charges.additionalNote")} />
            </FormField>
            <FormField
              label="Discount (%)"
              htmlFor="p-disc"
              error={errors.charges?.discountPercent?.message ?? (charges.discountPercent > settings.maxDiscountPercent ? `Maximum allowed discount is ${settings.maxDiscountPercent}%` : undefined)}
              hint={`= ${formatMoney(totals.discountAmount, cur)} · max ${settings.maxDiscountPercent}%`}
            >
              <MoneyInput id="p-disc" prefix="%" max={settings.maxDiscountPercent} {...register("charges.discountPercent", { setValueAs: numberValue })} />
            </FormField>
            {(settings.taxEnabled || charges.taxPercent > 0) && (
              <FormField label="Tax (%)" htmlFor="p-tax" error={errors.charges?.taxPercent?.message} hint={`= ${formatMoney(totals.taxAmount, cur)} on amount after discount`}>
                <MoneyInput id="p-tax" prefix="%" {...register("charges.taxPercent", { setValueAs: numberValue })} />
              </FormField>
            )}
          </div>
        </SectionCard>

        {/* Advance payment (create only) */}
        {!isEdit && (
          <SectionCard icon={Wallet} title="Advance Payment" description="Optional. Later payments are added from the booking page.">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                label="Advance amount"
                htmlFor="a-amount"
                error={errors.advance?.amount?.message ?? (advanceTooHigh ? "Cannot exceed the grand total" : undefined)}
              >
                <MoneyInput id="a-amount" prefix={cur} invalid={advanceTooHigh} {...register("advance.amount", { setValueAs: numberValue })} />
              </FormField>
              <FormField label="Payment date" htmlFor="a-date" error={errors.advance?.date?.message}>
                <Controller
                  control={control}
                  name="advance.date"
                  render={({ field }) => <DatePicker id="a-date" value={field.value} onChange={field.onChange} />}
                />
              </FormField>
              <FormField label="Payment method">
                <Controller
                  control={control}
                  name="advance.method"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="h-9! w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PAYMENT_METHODS.map((m) => (
                          <SelectItem key={m} value={m}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </FormField>
              <FormField label="Reference / transaction ID" htmlFor="a-ref">
                <Input id="a-ref" className={inputCls} placeholder="Optional" {...register("advance.reference")} />
              </FormField>
            </div>
          </SectionCard>
        )}
      </div>

      {/* Sticky summary */}
      <aside className="space-y-4 xl:sticky xl:top-22 xl:self-start">
        <div className="rounded-xl border bg-card p-5 shadow-xs">
          <h3 className="mb-3 font-semibold">Availability</h3>
          <AvailabilityAlert conflicts={conflicts} customers={customers} ready={availabilityReady} />
          {availabilityReady && (
            <p className="mt-3 text-xs text-muted-foreground">
              {hall?.name} · {formatDate(event.date, "EEE, dd MMM yyyy")} · {formatDuration(duration)}
            </p>
          )}
        </div>
        <div className="rounded-xl border bg-card p-5 shadow-xs">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold">Booking Summary</h3>
            <PaymentBadge status={paymentStatus} />
          </div>
          <PricingBreakdown charges={charges} guests={event.guests} totals={totals} summary={summary} currency={cur} />
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="lg" className="flex-1" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" size="lg" className="flex-1" disabled={submitting || conflicts.blocking.length > 0}>
            {submitting ? <LoaderCircle className="animate-spin" /> : <Save />}
            {isEdit ? "Save changes" : "Create booking"}
          </Button>
        </div>
      </aside>
    </form>
  );
}
