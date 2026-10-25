"use client";

import { useMemo, useState } from "react";
import { endOfMonth, endOfYear, format, startOfMonth, startOfYear, subMonths } from "date-fns";
import { Banknote, CircleDollarSign, ClipboardList, Download, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DatePicker } from "@/components/shared/date-picker";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { formatCompactMoney, formatDuration, formatMoney, toDateKey } from "@/lib/format";
import { useBookingViews } from "@/lib/hooks";
import { useStore } from "@/lib/store";
import { BOOKING_STATUSES, EVENT_TYPES, PAYMENT_METHODS } from "@/lib/types";
import { bookingStatusStyles } from "@/lib/ui";
import { cn } from "@/lib/utils";

type Range = "this-month" | "last-month" | "this-year" | "all" | "custom";

function rangeDates(range: Range, from: string, to: string): [string, string] {
  const now = new Date();
  switch (range) {
    case "this-month":
      return [toDateKey(startOfMonth(now)), toDateKey(endOfMonth(now))];
    case "last-month": {
      const m = subMonths(now, 1);
      return [toDateKey(startOfMonth(m)), toDateKey(endOfMonth(m))];
    }
    case "this-year":
      return [toDateKey(startOfYear(now)), toDateKey(endOfYear(now))];
    case "custom":
      return [from, to];
    default:
      return ["", ""];
  }
}

function BarList({ items, currency }: { items: { label: string; count: number; value: number; color?: string }[]; currency: string }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  const visible = items.filter((i) => i.count > 0 || i.value > 0);
  if (!visible.length) return <p className="py-6 text-center text-sm text-muted-foreground">No data for this period.</p>;
  return (
    <ul className="space-y-3">
      {visible.map((i) => (
        <li key={i.label}>
          <div className="mb-1 flex items-center justify-between gap-3 text-sm">
            <span className="flex items-center gap-2 truncate">
              {i.color && <span className="size-2.5 shrink-0 rounded-full" style={{ background: i.color }} />}
              {i.label}
              <span className="text-xs text-muted-foreground">({i.count})</span>
            </span>
            <span className="font-medium tabular-nums">{formatMoney(i.value, currency)}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary" style={{ width: `${(i.value / max) * 100}%`, background: i.color }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function csvEscape(v: string | number) {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export default function ReportsPage() {
  const views = useBookingViews();
  const halls = useStore((s) => s.halls);
  const payments = useStore((s) => s.payments);
  const cur = useStore((s) => s.settings.currency);
  const [range, setRange] = useState<Range>("this-year");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [start, end] = rangeDates(range, from, to);

  const inRange = (date: string) => (!start || date >= start) && (!end || date <= end);

  const r = useMemo(() => {
    const list = views.filter((v) => inRange(v.booking.event.date));
    const active = list.filter((v) => v.booking.status !== "Cancelled");
    const collected = payments.filter((p) => !p.voided && inRange(p.date));
    const byType = EVENT_TYPES.map((t) => {
      const l = active.filter((v) => v.booking.event.type === t);
      return { label: t, count: l.length, value: l.reduce((s, v) => s + v.totals.grandTotal, 0) };
    }).sort((a, b) => b.value - a.value);
    const byHall = halls.map((h) => {
      const l = active.filter((v) => v.booking.event.hallId === h.id);
      return {
        label: h.name,
        color: h.color,
        count: l.length,
        value: l.reduce((s, v) => s + v.totals.grandTotal, 0),
        minutes: l.reduce((s, v) => s + v.durationMinutes, 0),
        guests: l.reduce((s, v) => s + v.booking.event.guests, 0),
      };
    });
    const byMethod = PAYMENT_METHODS.map((m) => {
      const l = collected.filter((p) => p.method === m);
      return { label: m, count: l.length, value: l.reduce((s, p) => s + p.amount, 0) };
    });
    const byStatus = BOOKING_STATUSES.map((s) => ({ status: s, count: list.filter((v) => v.booking.status === s).length }));
    return {
      list,
      active,
      booked: active.reduce((s, v) => s + v.totals.grandTotal, 0),
      collected: collected.reduce((s, p) => s + p.amount, 0),
      outstanding: active.reduce((s, v) => s + Math.max(0, v.summary.remaining), 0),
      guests: active.reduce((s, v) => s + v.booking.event.guests, 0),
      discounts: active.reduce((s, v) => s + v.totals.discountAmount, 0),
      byType,
      byHall,
      byMethod,
      byStatus,
    };
    // inRange is derived from start/end
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [views, payments, halls, start, end]);

  const exportCsv = () => {
    const header = ["Booking #", "Created", "Customer", "Mobile", "Event", "Type", "Event date", "Start", "End", "Guests", "Hall", "Status", "Payment status", "Grand total", "Paid", "Balance"];
    const lines = r.list.map((v) =>
      [
        v.booking.bookingNumber,
        format(new Date(v.booking.createdAt), "yyyy-MM-dd"),
        v.customer?.name ?? "",
        v.customer?.mobile ?? "",
        v.booking.event.title,
        v.booking.event.type,
        v.booking.event.date,
        v.booking.event.startTime,
        v.booking.event.endTime,
        v.booking.event.guests,
        v.hall?.name ?? "",
        v.booking.status,
        v.summary.status,
        v.totals.grandTotal,
        v.summary.totalPaid,
        v.summary.remaining,
      ].map(csvEscape).join(","),
    );
    const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bookings-report-${start || "all"}-${end || "time"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <PageHeader
        title="Reports"
        description="Business performance by period, event type, hall and payment method."
        actions={
          <>
            <Select value={range} onValueChange={(v) => setRange(v as Range)}>
              <SelectTrigger className="h-9! w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="this-month">This month</SelectItem>
                <SelectItem value="last-month">Last month</SelectItem>
                <SelectItem value="this-year">This year</SelectItem>
                <SelectItem value="all">All time</SelectItem>
                <SelectItem value="custom">Custom range</SelectItem>
              </SelectContent>
            </Select>
            {range === "custom" && (
              <>
                <div className="w-44"><DatePicker value={from} onChange={setFrom} placeholder="From" /></div>
                <div className="w-44"><DatePicker value={to} onChange={setTo} placeholder="To" /></div>
              </>
            )}
            <Button variant="outline" size="lg" onClick={exportCsv} disabled={!r.list.length}><Download /> Export CSV</Button>
          </>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Bookings (by event date)" value={r.list.length} hint={`${r.active.length} active · ${r.list.length - r.active.length} cancelled`} icon={ClipboardList} />
        <StatCard label="Booked value" value={formatCompactMoney(r.booked, cur)} hint={`Discounts given ${formatCompactMoney(r.discounts, cur)}`} icon={Banknote} tone="gold" />
        <StatCard label="Collected (by payment date)" value={formatCompactMoney(r.collected, cur)} icon={Banknote} tone="success" />
        <StatCard label="Outstanding" value={formatCompactMoney(r.outstanding, cur)} hint={`${r.guests.toLocaleString()} guests hosted`} icon={CircleDollarSign} tone="danger" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border bg-card p-5 shadow-xs">
          <h2 className="mb-4 font-semibold">Revenue by event type</h2>
          <BarList items={r.byType} currency={cur} />
        </section>
        <section className="rounded-xl border bg-card p-5 shadow-xs">
          <h2 className="mb-4 font-semibold">Collections by payment method</h2>
          <BarList items={r.byMethod} currency={cur} />
        </section>
        <section className="rounded-xl border bg-card shadow-xs lg:col-span-2">
          <header className="border-b px-5 py-4"><h2 className="font-semibold">Hall performance</h2></header>
          <div className="overflow-x-auto">
            <Table className="min-w-[640px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Hall</TableHead>
                  <TableHead className="text-right">Events</TableHead>
                  <TableHead className="text-right">Hours booked</TableHead>
                  <TableHead className="text-right">Guests</TableHead>
                  <TableHead className="text-right">Booked value</TableHead>
                  <TableHead className="w-1/4">Share</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {r.byHall.map((h) => (
                  <TableRow key={h.label}>
                    <TableCell><span className="inline-flex items-center gap-2"><span className="size-2.5 rounded-full" style={{ background: h.color }} />{h.label}</span></TableCell>
                    <TableCell className="text-right tabular-nums">{h.count}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatDuration(h.minutes)}</TableCell>
                    <TableCell className="text-right tabular-nums">{h.guests.toLocaleString()}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatMoney(h.value, cur)}</TableCell>
                    <TableCell>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full" style={{ width: `${r.booked ? (h.value / r.booked) * 100 : 0}%`, background: h.color }} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {r.byHall.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="py-6 text-center text-muted-foreground">No halls configured.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </section>
        <section className="rounded-xl border bg-card p-5 shadow-xs lg:col-span-2">
          <h2 className="mb-4 font-semibold">Bookings by status</h2>
          <div className="grid gap-3 sm:grid-cols-4">
            {r.byStatus.map((s) => (
              <div key={s.status} className="rounded-lg border p-4">
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className={cn("size-2.5 rounded-full", bookingStatusStyles[s.status].dot)} /> {s.status}
                </p>
                <p className="mt-1 text-2xl font-semibold tabular-nums">{s.count}</p>
                <p className="text-xs text-muted-foreground">{r.list.length ? Math.round((s.count / r.list.length) * 100) : 0}% of bookings</p>
              </div>
            ))}
          </div>
        </section>
      </div>
      <p className="mt-6 flex items-center gap-2 text-xs text-muted-foreground"><Users className="size-3.5" /> Booked value and outstanding exclude cancelled bookings.</p>
    </>
  );
}
