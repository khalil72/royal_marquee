"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, ArrowUpDown, ClipboardList, Funnel, Moon, Plus, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BookingActionsMenu } from "@/components/bookings/booking-actions";
import { DatePicker } from "@/components/shared/date-picker";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatDate, formatMoney, formatTime } from "@/lib/format";
import { useBookingViews, type BookingView } from "@/lib/hooks";
import { useStore } from "@/lib/store";
import { BOOKING_STATUSES, EVENT_TYPES } from "@/lib/types";

const ALL = "all";
const PAGE_SIZE = 15;

type SortKey = "number" | "customer" | "date" | "guests" | "total" | "paid" | "remaining" | "created";
const sorters: Record<SortKey, (v: BookingView) => string | number> = {
  number: (v) => v.booking.bookingNumber,
  customer: (v) => v.customer?.name.toLowerCase() ?? "",
  date: (v) => v.start.getTime(),
  guests: (v) => v.booking.event.guests,
  total: (v) => v.totals.grandTotal,
  paid: (v) => v.summary.totalPaid,
  remaining: (v) => v.summary.remaining,
  created: (v) => v.booking.createdAt,
};

function SortHead({
  k,
  sort,
  onToggle,
  children,
  className,
}: {
  k: SortKey;
  sort: { key: SortKey; dir: "asc" | "desc" };
  onToggle: (k: SortKey) => void;
  children: React.ReactNode;
  className?: string;
}) {
  const active = sort.key === k;
  return (
    <TableHead className={className} aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : undefined}>
      <button
        type="button"
        onClick={() => onToggle(k)}
        className={cn("inline-flex items-center gap-1 hover:text-foreground", className?.includes("text-right") && "flex-row-reverse")}
      >
        {children}
        {active ? (
          sort.dir === "asc" ? <ArrowUp className="size-3.5" /> : <ArrowDown className="size-3.5" />
        ) : (
          <ArrowUpDown className="size-3.5 opacity-40" />
        )}
      </button>
    </TableHead>
  );
}

export default function BookingsPage() {
  const views = useBookingViews();
  const halls = useStore((s) => s.halls);
  const currency = useStore((s) => s.settings.currency);

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<string>(ALL);
  const [type, setType] = useState<string>(ALL);
  const [hallId, setHallId] = useState<string>(ALL);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "created", dir: "desc" });
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = views.filter((v) => {
      const b = v.booking;
      if (status !== ALL && b.status !== status) return false;
      if (type !== ALL && b.event.type !== type) return false;
      if (hallId !== ALL && b.event.hallId !== hallId) return false;
      if (from && b.event.date < from) return false;
      if (to && b.event.date > to) return false;
      if (!q) return true;
      return [b.bookingNumber, b.event.title, v.customer?.name, v.customer?.mobile, v.customer?.cnic, v.hall?.name]
        .filter(Boolean)
        .some((s) => s!.toLowerCase().includes(q));
    });
    const get = sorters[sort.key];
    return list.sort((a, b) => {
      const x = get(a);
      const y = get(b);
      const r = x < y ? -1 : x > y ? 1 : 0;
      return sort.dir === "asc" ? r : -r;
    });
  }, [views, query, status, type, hallId, from, to, sort]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const rows = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const hasFilters = query || status !== ALL || type !== ALL || hallId !== ALL || from || to;

  const resetFilters = () => {
    setQuery("");
    setStatus(ALL);
    setType(ALL);
    setHallId(ALL);
    setFrom("");
    setTo("");
    setPage(1);
  };

  const toggleSort = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: key === "customer" || key === "number" ? "asc" : "desc" }));

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: views.length };
    for (const v of views) c[v.booking.status] = (c[v.booking.status] ?? 0) + 1;
    return c;
  }, [views]);

  return (
    <>
      <PageHeader
        title="Event Bookings"
        description="Search, filter and manage every booking."
        actions={
          <Button asChild size="lg">
            <Link href="/bookings/new"><Plus /> New Booking</Link>
          </Button>
        }
      />

      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {[ALL, ...BOOKING_STATUSES].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => { setStatus(s); setPage(1); }}
            className={cn(
              "inline-flex h-8 shrink-0 items-center gap-2 rounded-full border px-3 text-sm transition-colors",
              status === s ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-muted",
            )}
          >
            {s === ALL ? "All" : s}
            <span className={cn("rounded-full px-1.5 text-xs", status === s ? "bg-primary-foreground/20" : "bg-muted")}>
              {counts[s] ?? 0}
            </span>
          </button>
        ))}
      </div>

      <div className="rounded-xl border bg-card shadow-xs">
        <div className="grid gap-2 border-b p-4 sm:grid-cols-2 lg:grid-cols-[minmax(220px,1fr)_160px_180px_170px_170px_auto]">
          <div className="relative sm:col-span-2 lg:col-span-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => { setQuery(e.target.value); setPage(1); }}
              placeholder="Search number, customer, mobile, event…"
              className="h-9 pl-9"
              aria-label="Search bookings"
            />
          </div>
          <Select value={type} onValueChange={(v) => { setType(v); setPage(1); }}>
            <SelectTrigger className="h-9! w-full" aria-label="Event type"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All event types</SelectItem>
              {EVENT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={hallId} onValueChange={(v) => { setHallId(v); setPage(1); }}>
            <SelectTrigger className="h-9! w-full" aria-label="Hall"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All halls</SelectItem>
              {halls.map((h) => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <DatePicker value={from} onChange={(v) => { setFrom(v); setPage(1); }} placeholder="From date" />
          <DatePicker value={to} onChange={(v) => { setTo(v); setPage(1); }} placeholder="To date" />
          {hasFilters ? (
            <Button variant="ghost" className="h-9" onClick={resetFilters}><X /> Clear</Button>
          ) : (
            <span className="hidden items-center gap-1.5 px-2 text-xs text-muted-foreground lg:flex"><Funnel className="size-3.5" /> Filters</span>
          )}
        </div>

        {rows.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title={hasFilters ? "No bookings match your filters" : "No bookings yet"}
            description={hasFilters ? "Try a different search or clear the filters." : "Create your first event booking to get started."}
            action={
              hasFilters ? (
                <Button variant="outline" onClick={resetFilters}>Clear filters</Button>
              ) : (
                <Button asChild><Link href="/bookings/new"><Plus /> New Booking</Link></Button>
              )
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <Table className="min-w-[1250px]">
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <SortHead sort={sort} onToggle={toggleSort} k="number">Booking #</SortHead>
                  <SortHead sort={sort} onToggle={toggleSort} k="customer">Customer</SortHead>
                  <TableHead>Event Type</TableHead>
                  <SortHead sort={sort} onToggle={toggleSort} k="date">Event Date</SortHead>
                  <TableHead>Time</TableHead>
                  <SortHead sort={sort} onToggle={toggleSort} k="guests" className="text-right">Guests</SortHead>
                  <TableHead>Hall</TableHead>
                  <SortHead sort={sort} onToggle={toggleSort} k="total" className="text-right">Grand Total</SortHead>
                  <SortHead sort={sort} onToggle={toggleSort} k="paid" className="text-right">Paid</SortHead>
                  <SortHead sort={sort} onToggle={toggleSort} k="remaining" className="text-right">Balance</SortHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12"><span className="sr-only">Actions</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((v) => {
                  const b = v.booking;
                  return (
                    <TableRow key={b.id} className={cn(b.status === "Cancelled" && "bg-rose-50/40 text-muted-foreground dark:bg-rose-500/5")}>
                      <TableCell>
                        <Link href={`/bookings/${b.id}`} className="font-mono text-xs font-semibold text-primary hover:underline">
                          {b.bookingNumber}
                        </Link>
                        <p className="max-w-44 truncate text-xs text-muted-foreground">{b.event.title}</p>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium text-foreground">{v.customer?.name ?? "—"}</p>
                        <p className="text-xs text-muted-foreground">{v.customer?.mobile}</p>
                      </TableCell>
                      <TableCell>{b.event.type}</TableCell>
                      <TableCell className="whitespace-nowrap">{formatDate(b.event.date, "EEE, dd MMM yyyy")}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        {formatTime(b.event.startTime)} – {formatTime(b.event.endTime)}
                        {b.event.overnight && <Moon className="ml-1 inline size-3 text-muted-foreground" aria-label="Ends next day" />}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{b.event.guests}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-2 whitespace-nowrap">
                          <span className="size-2 rounded-full" style={{ background: v.hall?.color }} />
                          {v.hall?.name ?? "—"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">{formatMoney(v.totals.grandTotal, currency)}</TableCell>
                      <TableCell className="text-right text-success tabular-nums">{formatMoney(v.summary.totalPaid, currency)}</TableCell>
                      <TableCell className={cn("text-right font-medium tabular-nums", v.summary.remaining > 0 ? "text-destructive" : "text-muted-foreground")}>
                        {formatMoney(v.summary.remaining, currency)}
                      </TableCell>
                      <TableCell><StatusBadge status={b.status} /></TableCell>
                      <TableCell><BookingActionsMenu view={v} /></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {filtered.length > 0 && (
          <div className="flex flex-col items-center justify-between gap-3 border-t px-4 py-3 text-sm text-muted-foreground sm:flex-row">
            <p>
              Showing {(current - 1) * PAGE_SIZE + 1}–{Math.min(current * PAGE_SIZE, filtered.length)} of {filtered.length} bookings
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={current <= 1} onClick={() => setPage(current - 1)}>Previous</Button>
              <span>Page {current} of {pages}</span>
              <Button variant="outline" size="sm" disabled={current >= pages} onClick={() => setPage(current + 1)}>Next</Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
