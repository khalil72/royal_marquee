"use client";

import { useMemo } from "react";
import Link from "next/link";
import { addMonths, format, isSameDay, isSameMonth, startOfMonth, subMonths } from "date-fns";
import {
  ArrowRight,
  Banknote,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  ClipboardList,
  FileText,
  Hourglass,
  Moon,
  Plus,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { StatCard } from "@/components/shared/stat-card";
import { PaymentBadge, StatusBadge } from "@/components/shared/status-badge";
import { formatCompactMoney, formatDate, formatMoney, formatTime } from "@/lib/format";
import { useBookingViews } from "@/lib/hooks";
import { useStore } from "@/lib/store";
import { bookingStatusStyles } from "@/lib/ui";

export default function DashboardPage() {
  const views = useBookingViews();
  const customers = useStore((s) => s.customers);
  const payments = useStore((s) => s.payments);
  const settings = useStore((s) => s.settings);
  const cur = settings.currency;

  const data = useMemo(() => {
    const now = new Date();
    const active = views.filter((v) => v.booking.status !== "Cancelled");
    const today = active.filter((v) => isSameDay(v.start, now) || (v.start < now && v.end > now));
    const upcoming = active
      .filter((v) => v.start > now && v.booking.status !== "Completed")
      .sort((a, b) => a.start.getTime() - b.start.getTime());
    const received = payments.filter((p) => !p.voided).reduce((s, p) => s + p.amount, 0);
    const bookedValue = active.reduce((s, v) => s + v.totals.grandTotal, 0);
    const outstanding = active.reduce((s, v) => s + Math.max(0, v.summary.remaining), 0);
    const recent = [...views].sort((a, b) => b.booking.createdAt.localeCompare(a.booking.createdAt)).slice(0, 6);

    // Payments collected per month, last 6 months
    const months = Array.from({ length: 6 }, (_, i) => startOfMonth(subMonths(now, 5 - i)));
    const monthly = months.map((m) => {
      const key = format(m, "yyyy-MM");
      const total = payments.filter((p) => !p.voided && p.date.startsWith(key)).reduce((s, p) => s + p.amount, 0);
      return { label: format(m, "MMM"), total };
    });

    // Events per month by event date: 5 months back, this month, 6 ahead
    const eventMonths = Array.from({ length: 12 }, (_, i) => addMonths(startOfMonth(now), i - 5)).map((m) => {
      const inMonth = active.filter((v) => isSameMonth(v.start, m));
      return {
        key: format(m, "yyyy-MM"),
        label: format(m, "MMM"),
        year: format(m, "yyyy"),
        count: inMonth.length,
        guests: inMonth.reduce((s, v) => s + v.booking.event.guests, 0),
        when: isSameMonth(m, now) ? "current" : m < now ? "past" : "future",
      } as const;
    });

    return {
      total: views.length,
      cancelled: views.length - active.length,
      completed: views.filter((v) => v.booking.status === "Completed").length,
      today,
      upcoming,
      confirmed: views.filter((v) => v.booking.status === "Confirmed").length,
      pending: views.filter((v) => v.booking.status === "Pending").length,
      received,
      bookedValue,
      outstanding,
      dueCount: active.filter((v) => v.summary.remaining > 0).length,
      recent,
      monthly,
      eventMonths,
    };
  }, [views, payments]);

  const maxMonthly = Math.max(1, ...data.monthly.map((m) => m.total));
  const maxEvents = Math.max(1, ...data.eventMonths.map((m) => m.count));
  const pastEvents = data.eventMonths.filter((m) => m.when !== "future").reduce((s, m) => s + m.count, 0);
  const aheadEvents = data.eventMonths.filter((m) => m.when === "future").reduce((s, m) => s + m.count, 0);

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary to-[oklch(0.38_0.17_300)] p-6 text-primary-foreground shadow-sm dark:from-[oklch(0.35_0.14_302)] dark:to-[oklch(0.25_0.08_300)] dark:text-foreground">
        <div className="absolute -top-16 -right-10 size-56 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-20 right-40 size-40 rounded-full bg-gold/30 blur-3xl" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm opacity-80">{format(new Date(), "EEEE, dd MMMM yyyy")}</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">Welcome back to {settings.businessName}</h1>
            <p className="mt-1 text-sm opacity-85">
              {data.today.length
                ? `You have ${data.today.length} event${data.today.length > 1 ? "s" : ""} today and ${data.upcoming.length} upcoming.`
                : `No events today · ${data.upcoming.length} upcoming events.`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild size="lg" className="bg-white text-primary hover:bg-white/90 dark:bg-primary dark:text-primary-foreground">
              <Link href="/bookings/new"><Plus /> New Booking</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-white/30 bg-white/10 text-inherit hover:bg-white/20 hover:text-inherit dark:border-white/15">
              <Link href="/calendar"><CalendarCheck /> Check Availability</Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Total Events"
          value={data.total}
          hint={`All bookings ever · ${data.completed} completed · ${data.cancelled} cancelled`}
          icon={ClipboardList}
          href="/bookings"
        />
        <StatCard label="Today's Events" value={data.today.length} hint={`Happening on ${format(new Date(), "dd MMM yyyy")}`} icon={CalendarDays} tone="gold" href="/calendar" />
        <StatCard label="Upcoming Events" value={data.upcoming.length} hint={data.upcoming[0] ? `Next on ${formatDate(data.upcoming[0].booking.event.date)}` : "Nothing scheduled"} icon={CalendarClock} tone="info" href="/calendar" />
        <StatCard label="Confirmed Bookings" value={data.confirmed} hint="Booked and confirmed" icon={CalendarCheck} tone="success" href="/bookings" />
        <StatCard label="Pending Bookings" value={data.pending} hint="Awaiting confirmation" icon={Hourglass} tone="warning" href="/bookings" />
        <StatCard label="Completed Events" value={data.completed} hint="Events already held" icon={CheckCircle2} tone="primary" href="/bookings" />
        <StatCard label="Total Revenue" value={formatCompactMoney(data.received, cur)} hint={`Collected · booked ${formatCompactMoney(data.bookedValue, cur)}`} icon={Banknote} tone="success" href="/payments" />
        <StatCard label="Outstanding Payments" value={formatCompactMoney(data.outstanding, cur)} hint={`${data.dueCount} booking${data.dueCount === 1 ? "" : "s"} with balance due`} icon={CircleDollarSign} tone="danger" href="/payments" />
        <StatCard label="Total Customers" value={customers.length} hint="Saved in your customer list" icon={Users} tone="info" href="/customers" />
      </div>

      {/* Events by month */}
      <section className="rounded-xl border bg-card p-5 shadow-xs">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold">Events by Month</h2>
            <p className="text-sm text-muted-foreground">
              {pastEvents} held or this month · {aheadEvents} booked in the next 6 months
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-primary/45" /> Past</span>
            <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-primary" /> This month</span>
            <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-gold" /> Upcoming</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <div className="flex h-48 min-w-[560px] items-end gap-2 sm:gap-3" role="img" aria-label="Events per month, five months back to six months ahead">
            {data.eventMonths.map((m) => (
              <Link
                key={m.key}
                href="/calendar"
                className="group flex h-full flex-1 flex-col items-center justify-end gap-1.5"
                title={`${m.label} ${m.year}: ${m.count} event${m.count === 1 ? "" : "s"}${m.guests ? ` · ${m.guests.toLocaleString()} guests` : ""}`}
              >
                <span className={cn("text-xs font-semibold tabular-nums", m.count ? "text-foreground" : "text-muted-foreground/60")}>{m.count}</span>
                <div
                  className={cn(
                    "w-full rounded-t-md transition-opacity group-hover:opacity-80",
                    m.when === "past" && "bg-primary/45",
                    m.when === "current" && "bg-primary",
                    m.when === "future" && "bg-gold",
                  )}
                  style={{ height: `${Math.max(3, (m.count / maxEvents) * 136)}px` }}
                />
                <span className={cn("text-xs", m.when === "current" ? "font-semibold text-primary" : "text-muted-foreground")}>{m.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        {/* Upcoming */}
        <section className="rounded-xl border bg-card shadow-xs">
          <header className="flex items-center justify-between border-b px-5 py-4">
            <div>
              <h2 className="font-semibold">Upcoming Events</h2>
              <p className="text-sm text-muted-foreground">In chronological order</p>
            </div>
            <Button asChild variant="ghost" size="sm"><Link href="/calendar">Calendar <ArrowRight /></Link></Button>
          </header>
          {data.upcoming.length === 0 ? (
            <EmptyState icon={CalendarClock} title="No upcoming events" description="New bookings will appear here." action={<Button asChild><Link href="/bookings/new"><Plus /> New booking</Link></Button>} />
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-[680px]">
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Date & time</TableHead>
                    <TableHead>Event</TableHead>
                    <TableHead>Hall</TableHead>
                    <TableHead className="text-right">Guests</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.upcoming.slice(0, 7).map((v) => (
                    <TableRow key={v.booking.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex w-11 shrink-0 flex-col items-center rounded-lg bg-primary/10 py-1 text-primary">
                            <span className="text-[10px] font-medium uppercase">{format(v.start, "MMM")}</span>
                            <span className="text-base leading-none font-bold">{format(v.start, "d")}</span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            <p className="font-medium text-foreground">{format(v.start, "EEE")}</p>
                            {formatTime(v.booking.event.startTime)} – {formatTime(v.booking.event.endTime)}
                            {v.booking.event.overnight && <Moon className="ml-1 inline size-3" />}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Link href={`/bookings/${v.booking.id}`} className="font-medium hover:underline">{v.booking.event.title}</Link>
                        <p className="text-xs text-muted-foreground">{v.booking.event.type} · {v.customer?.name}</p>
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-2 whitespace-nowrap">
                          <span className="size-2 rounded-full" style={{ background: v.hall?.color }} />
                          {v.space}
                        </span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{v.booking.event.guests}</TableCell>
                      <TableCell className={cn("text-right tabular-nums", v.summary.remaining > 0 && "text-destructive")}>{formatMoney(v.summary.remaining, cur)}</TableCell>
                      <TableCell><StatusBadge status={v.booking.status} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </section>

        {/* Right column */}
        <div className="space-y-6">
          <section className="rounded-xl border bg-card p-5 shadow-xs">
            <h2 className="mb-3 font-semibold">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-2">
              {[
                { href: "/bookings/new", label: "New booking", icon: Plus },
                { href: "/calendar", label: "Availability", icon: CalendarCheck },
                { href: "/payments", label: "Add payment", icon: Wallet },
                { href: "/customers", label: "Customers", icon: UserPlus },
                { href: "/invoices", label: "Invoices", icon: FileText },
                { href: "/reports", label: "Reports", icon: Banknote },
              ].map((a) => (
                <Link key={a.href} href={a.href} className="flex flex-col items-start gap-2 rounded-lg border p-3 text-sm font-medium transition-colors hover:border-primary/40 hover:bg-primary/5">
                  <a.icon className="size-4 text-primary" />
                  {a.label}
                </Link>
              ))}
            </div>
          </section>

          <section className="rounded-xl border bg-card p-5 shadow-xs">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold">Collections</h2>
              <span className="text-xs text-muted-foreground">Last 6 months</span>
            </div>
            <div className="flex h-40 items-end gap-2" role="img" aria-label="Payments collected per month">
              {data.monthly.map((m) => (
                <div key={m.label} className="group flex flex-1 flex-col items-center gap-1.5">
                  <span className="text-[10px] font-medium text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
                    {formatCompactMoney(m.total, "")}
                  </span>
                  <div
                    className="w-full rounded-t-md bg-primary/80 transition-colors group-hover:bg-primary"
                    style={{ height: `${Math.max(3, (m.total / maxMonthly) * 112)}px` }}
                    title={`${m.label}: ${formatMoney(m.total, cur)}`}
                  />
                  <span className="text-xs text-muted-foreground">{m.label}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      {/* Today + recent */}
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border bg-card shadow-xs">
          <header className="border-b px-5 py-4">
            <h2 className="font-semibold">Today&apos;s Schedule</h2>
          </header>
          {data.today.length === 0 ? (
            <EmptyState icon={CalendarDays} title="No events today" className="py-10" />
          ) : (
            <ul className="divide-y">
              {data.today.map((v) => (
                <li key={v.booking.id}>
                  <Link href={`/bookings/${v.booking.id}`} className="flex items-center gap-4 px-5 py-3 transition-colors hover:bg-muted/40">
                    <span className={cn("h-10 w-1 rounded-full", bookingStatusStyles[v.booking.status].dot)} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{v.booking.event.title}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {formatTime(v.booking.event.startTime)} – {formatTime(v.booking.event.endTime)} · {v.space} · {v.booking.event.guests} guests
                      </p>
                    </div>
                    <StatusBadge status={v.booking.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="rounded-xl border bg-card shadow-xs">
          <header className="flex items-center justify-between border-b px-5 py-4">
            <h2 className="font-semibold">Recent Bookings</h2>
            <Button asChild variant="ghost" size="sm"><Link href="/bookings">View all <ArrowRight /></Link></Button>
          </header>
          {data.recent.length === 0 ? (
            <EmptyState icon={ClipboardList} title="No bookings yet" className="py-10" />
          ) : (
            <ul className="divide-y">
              {data.recent.map((v) => (
                <li key={v.booking.id}>
                  <Link href={`/bookings/${v.booking.id}`} className="flex items-center gap-4 px-5 py-3 transition-colors hover:bg-muted/40">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{v.customer?.name ?? "—"}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        <span className="font-mono">{v.booking.bookingNumber}</span> · {v.booking.event.type} · {formatDate(v.booking.event.date)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium tabular-nums">{formatMoney(v.totals.grandTotal, cur)}</p>
                      <PaymentBadge status={v.summary.status} className="mt-0.5 h-5 text-[10px]" />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
