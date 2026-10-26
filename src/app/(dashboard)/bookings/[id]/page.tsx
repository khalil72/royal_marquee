"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Ban,
  Building2,
  CalendarDays,
  ChevronDown,
  CircleCheck,
  Clock,
  FileText,
  Hourglass,
  Mail,
  MapPin,
  MessageCircle,
  Moon,
  Pencil,
  Phone,
  Printer,
  Receipt,
  RotateCcw,
  Trash2,
  UserRound,
  Users,
  Wallet,
  LayoutGrid,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BookingActionDialogs } from "@/components/bookings/booking-actions";
import { PricingBreakdown } from "@/components/bookings/pricing-breakdown";
import { PaymentsTable } from "@/components/payments/payments-table";
import { EmptyState } from "@/components/shared/empty-state";
import { NotFoundState } from "@/components/shared/not-found-state";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/form-field";
import { PaymentBadge, StatusBadge } from "@/components/shared/status-badge";
import { formatDate, formatDateTime, formatDuration, formatMoney, formatTime } from "@/lib/format";
import { useBookingView } from "@/lib/hooks";
import { spaceCapacity } from "@/lib/schedule";
import { useStore } from "@/lib/store";

function Info({ icon: Icon, label, children }: { icon: React.ComponentType<{ className?: string }>; label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="text-sm font-medium break-words">{children || "—"}</div>
      </div>
    </div>
  );
}

export default function BookingDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const view = useBookingView(id);
  const settings = useStore((s) => s.settings);
  const issueInvoice = useStore((s) => s.issueInvoice);
  const [pending, setPending] = useState<null | "confirm" | "cancel" | "restore" | "delete" | "payment">(null);
  const setBookingStatus = useStore((s) => s.setBookingStatus);
  const [invoiceBusy, setInvoiceBusy] = useState(false);

  if (!view) return <NotFoundState />;
  const { booking, customer, hall, totals, summary, payments, invoices } = view;
  const cur = settings.currency;
  const e = booking.event;

  const openInvoice = async (opts: { print?: boolean; forceNew?: boolean } = {}) => {
    if (invoiceBusy) return;
    setInvoiceBusy(true);
    const result = await issueInvoice(booking.id, opts.forceNew);
    setInvoiceBusy(false);
    if (!result.ok) return toast.error(result.error);
    if (opts.forceNew) toast.success(`Invoice ${result.data.invoiceNumber} issued`);
    router.push(`/invoices/${result.data.id}${opts.print ? "?print=1" : ""}`);
  };

  const markCompleted = async () => {
    const result = await setBookingStatus(booking.id, "Completed");
    if (!result.ok) toast.error(result.error);
    else toast.success("Booking marked as completed");
  };

  return (
    <>
      <PageHeader
        backHref="/bookings"
        title={
          <span className="flex flex-wrap items-center gap-3">
            {e.title}
            <StatusBadge status={booking.status} />
            <PaymentBadge status={summary.status} />
          </span>
        }
        description={
          <>
            <span className="font-mono">{booking.bookingNumber}</span> · Created {formatDateTime(booking.createdAt)} · Source:{" "}
            {booking.source}
          </>
        }
        actions={
          <>
            <Button asChild variant="outline" size="lg">
              <Link href={`/bookings/${booking.id}/edit`}><Pencil /> Edit Booking</Link>
            </Button>
            <Button variant="outline" size="lg" onClick={() => openInvoice({ print: true })} disabled={invoiceBusy}>
              <Printer /> Print Invoice
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="lg">Update Status <ChevronDown /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel>Change status</DropdownMenuLabel>
                {booking.status === "Pending" && (
                  <DropdownMenuItem onSelect={() => setPending("confirm")}><CircleCheck /> Confirm booking</DropdownMenuItem>
                )}
                {booking.status === "Confirmed" && (
                  <DropdownMenuItem onSelect={markCompleted}><CircleCheck /> Mark completed</DropdownMenuItem>
                )}
                {booking.status === "Cancelled" ? (
                  <DropdownMenuItem onSelect={() => setPending("restore")}><RotateCcw /> Restore as pending</DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onSelect={() => setPending("cancel")}><Ban /> Cancel booking</DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onSelect={() => setPending("delete")}><Trash2 /> Delete booking</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {booking.status !== "Cancelled" && (
              <Button size="lg" onClick={() => setPending("payment")} disabled={summary.remaining <= 0 && !settings.allowOverpayment}>
                <Wallet /> Add Payment
              </Button>
            )}
          </>
        }
      />

      {booking.status === "Cancelled" && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/8 p-4 text-sm text-destructive">
          <Ban className="size-5 shrink-0" />
          <div>
            <p className="font-semibold">This booking has been cancelled</p>
            <p className="text-xs">
              {booking.statusHistory.at(-1)?.note ?? "No reason recorded"} · The hall slot has been released. Records are kept for history.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <SectionCard icon={CalendarDays} title="Event & Schedule">
              <div className="grid gap-4 sm:grid-cols-2">
                <Info icon={CalendarDays} label="Event date">{formatDate(e.date, "EEEE, dd MMM yyyy")}</Info>
                <Info icon={Clock} label="Scheduled time">
                  {formatTime(e.startTime)} – {formatTime(e.endTime)}
                  {e.overnight && (
                    <span className="ml-1 inline-flex items-center gap-0.5 text-xs text-muted-foreground"><Moon className="size-3" /> next day</span>
                  )}
                </Info>
                <Info icon={Hourglass} label="Duration">{formatDuration(view.durationMinutes)}</Info>
                <Info icon={FileText} label="Event type">{e.type}</Info>
                <Info icon={Users} label="Guest count">{e.guests.toLocaleString()} guests</Info>
                <Info icon={UserRound} label="Organizer / contact">{e.organizer}</Info>
              </div>
            </SectionCard>
            <SectionCard icon={Building2} title="Venue">
              <div className="grid gap-4 sm:grid-cols-2">
                <Info icon={Building2} label="Marquee / hall">
                  <span className="inline-flex items-center gap-2">
                    <span className="size-2.5 rounded-full" style={{ background: hall?.color }} />
                    {hall?.name ?? "Deleted hall"}
                  </span>
                </Info>
                {hall?.divided && (
                  <Info icon={LayoutGrid} label="Booked space">{view.portion?.name ?? "Full hall (all portions)"}</Info>
                )}
                <Info icon={MapPin} label="Area">{e.venueArea || "Entire venue"}</Info>
                <Info icon={Users} label="Capacity">{hall ? `${spaceCapacity(hall, e.portionId)} guests` : "—"}</Info>
                <Info icon={MapPin} label="Location">{hall?.location}</Info>
              </div>
              {e.specialInstructions && (
                <div className="mt-4 rounded-lg bg-muted/50 p-3 text-sm">
                  <p className="mb-1 text-xs font-medium text-muted-foreground">Special instructions</p>
                  <p className="whitespace-pre-wrap">{e.specialInstructions}</p>
                </div>
              )}
            </SectionCard>
          </div>

          <SectionCard
            icon={UserRound}
            title="Customer"
            action={
              customer && (
                <Button asChild variant="ghost" size="sm">
                  <Link href={`/customers/${customer.id}`}>View profile</Link>
                </Button>
              )
            }
          >
            {customer ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Info icon={UserRound} label="Full name">{customer.name}</Info>
                <Info icon={Phone} label="Mobile"><a href={`tel:${customer.mobile}`} className="hover:underline">{customer.mobile}</a></Info>
                <Info icon={MessageCircle} label="WhatsApp">{customer.whatsapp}</Info>
                <Info icon={Mail} label="Email">{customer.email}</Info>
                <Info icon={FileText} label="CNIC">{customer.cnic}</Info>
                <Info icon={MapPin} label="Address">{customer.address}</Info>
                {customer.notes && <div className="sm:col-span-2 lg:col-span-3"><Info icon={FileText} label="Customer notes">{customer.notes}</Info></div>}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Customer record not found.</p>
            )}
          </SectionCard>

          <SectionCard
            icon={Wallet}
            title="Payment History"
            description={`${payments.filter((p) => !p.voided).length} active payment(s) · ${formatMoney(summary.totalPaid, cur)} received`}
            action={
              booking.status !== "Cancelled" && (
                <Button size="sm" variant="outline" onClick={() => setPending("payment")} disabled={summary.remaining <= 0 && !settings.allowOverpayment}>
                  <Wallet /> Add
                </Button>
              )
            }
            className="[&>div]:p-0"
          >
            {payments.length ? (
              <PaymentsTable rows={payments.map((payment) => ({ payment }))} />
            ) : (
              <EmptyState icon={Wallet} title="No payments yet" description="Record the advance payment to secure this booking." className="py-10" />
            )}
          </SectionCard>

          <div className="grid gap-6 lg:grid-cols-2">
            <SectionCard
              icon={Receipt}
              title="Invoice & Receipt History"
              action={
                <Button size="sm" variant="outline" onClick={() => openInvoice({ forceNew: invoices.length > 0 })} disabled={invoiceBusy}>
                  <FileText /> {invoices.length ? "Re-issue" : "Generate"}
                </Button>
              }
            >
              {invoices.length === 0 && payments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No invoice generated yet.</p>
              ) : (
                <ul className="divide-y text-sm">
                  {invoices.map((inv) => (
                    <li key={inv.id} className="flex items-center justify-between gap-3 py-2">
                      <div>
                        <Link href={`/invoices/${inv.id}`} className="font-mono font-medium hover:underline">{inv.invoiceNumber}</Link>
                        <p className="text-xs text-muted-foreground">Invoice · issued {formatDate(inv.issuedAt)} · {formatMoney(inv.amountAtIssue, cur)}</p>
                      </div>
                      <Button asChild size="sm" variant="ghost"><Link href={`/invoices/${inv.id}`}>Open</Link></Button>
                    </li>
                  ))}
                  {payments.map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-3 py-2">
                      <div>
                        <Link href={`/payments/${p.id}/receipt`} className="font-mono font-medium hover:underline">{p.receiptNumber}</Link>
                        <p className="text-xs text-muted-foreground">
                          Receipt · {formatDate(p.date)} · {formatMoney(p.amount, cur)}{p.voided && " · voided"}
                        </p>
                      </div>
                      <Button asChild size="sm" variant="ghost"><Link href={`/payments/${p.id}/receipt`}>Open</Link></Button>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>
            <SectionCard icon={Clock} title="Status & Notes">
              <ol className="relative space-y-3 border-l pl-4">
                {booking.statusHistory.map((h, i) => (
                  <li key={i} className="text-sm">
                    <span className="absolute -left-[5px] mt-1.5 size-2.5 rounded-full border-2 border-background bg-primary" />
                    <StatusBadge status={h.status} />
                    <span className="ml-2 text-xs text-muted-foreground">{formatDateTime(h.at)}</span>
                    {h.note && <p className="mt-0.5 text-xs text-muted-foreground">{h.note}</p>}
                  </li>
                ))}
              </ol>
              {booking.notes && (
                <div className="mt-4 rounded-lg bg-muted/50 p-3 text-sm">
                  <p className="mb-1 text-xs font-medium text-muted-foreground">Internal notes</p>
                  <p className="whitespace-pre-wrap">{booking.notes}</p>
                </div>
              )}
            </SectionCard>
          </div>
        </div>

        <aside className="space-y-4 xl:sticky xl:top-22 xl:self-start">
          <div className="rounded-xl border bg-card p-5 shadow-xs">
            <h3 className="mb-3 font-semibold">Pricing Breakdown</h3>
            <PricingBreakdown charges={booking.charges} guests={e.guests} totals={totals} summary={summary} currency={cur} />
          </div>
          <Button variant="outline" size="lg" className="w-full" onClick={() => openInvoice()} disabled={invoiceBusy}>
            <FileText /> Preview Invoice
          </Button>
        </aside>
      </div>

      <BookingActionDialogs view={view} pending={pending} setPending={setPending} onDeleted={() => router.push("/bookings")} />
    </>
  );
}
