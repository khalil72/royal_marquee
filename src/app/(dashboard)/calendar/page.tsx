"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  addDays,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfWeek,
  format,
  isToday,
  parseISO,
  startOfWeek,
} from "date-fns";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EventDialog } from "@/components/calendar/event-dialog";
import { MonthView } from "@/components/calendar/month-view";
import { TimeGrid, type GridColumn } from "@/components/calendar/time-grid";
import { toSegments } from "@/components/calendar/utils";
import { DatePicker } from "@/components/shared/date-picker";
import { PageHeader } from "@/components/shared/page-header";
import { toDateKey } from "@/lib/format";
import { useBookingViews, type BookingView } from "@/lib/hooks";
import { hallPortions } from "@/lib/schedule";
import { useStore } from "@/lib/store";
import { bookingStatusStyles } from "@/lib/ui";
import { BOOKING_STATUSES, EVENT_TYPES } from "@/lib/types";

type Mode = "month" | "week" | "day";
const ALL = "all";

export default function CalendarPage() {
  const router = useRouter();
  const allViews = useBookingViews();
  const halls = useStore((s) => s.halls);
  const currency = useStore((s) => s.settings.currency);
  const [mode, setMode] = useState<Mode>("month");
  const [cursor, setCursor] = useState(() => new Date());
  const [hallId, setHallId] = useState(ALL);
  const [type, setType] = useState(ALL);
  const [status, setStatus] = useState(ALL);
  const [showCancelled, setShowCancelled] = useState(false);
  const [selected, setSelected] = useState<BookingView | null>(null);

  const views = useMemo(
    () =>
      allViews.filter((v) => {
        const b = v.booking;
        if (hallId !== ALL && b.event.hallId !== hallId) return false;
        if (type !== ALL && b.event.type !== type) return false;
        if (status !== ALL) return b.status === status;
        return showCancelled || b.status !== "Cancelled";
      }),
    [allViews, hallId, type, status, showCancelled],
  );
  const segments = useMemo(() => toSegments(views), [views]);

  const step = (dir: 1 | -1) =>
    setCursor((c) => (mode === "month" ? addMonths(c, dir) : mode === "week" ? addWeeks(c, dir) : addDays(c, dir)));

  const newBooking = (dayKey: string, hour?: number, hall?: string, portion?: string) => {
    const params = new URLSearchParams({ date: dayKey });
    if (hour !== undefined) params.set("start", `${String(hour).padStart(2, "0")}:00`);
    const h = hall ?? (hallId !== ALL ? hallId : undefined);
    if (h) params.set("hall", h);
    if (h && portion) params.set("portion", portion);
    router.push(`/bookings/new?${params}`);
  };

  const title =
    mode === "month"
      ? format(cursor, "MMMM yyyy")
      : mode === "week"
        ? `${format(startOfWeek(cursor, { weekStartsOn: 1 }), "dd MMM")} – ${format(endOfWeek(cursor, { weekStartsOn: 1 }), "dd MMM yyyy")}`
        : format(cursor, "EEEE, dd MMMM yyyy");

  const weekColumns: GridColumn[] = useMemo(() => {
    const days = eachDayOfInterval({ start: startOfWeek(cursor, { weekStartsOn: 1 }), end: endOfWeek(cursor, { weekStartsOn: 1 }) });
    return days.map((d) => {
      const key = toDateKey(d);
      return {
        key,
        dayKey: key,
        header: (
          <button type="button" onClick={() => { setCursor(d); setMode("day"); }} className="w-full hover:text-primary">
            <span className="block text-xs text-muted-foreground">{format(d, "EEE")}</span>
            <span className={cn("mx-auto mt-0.5 flex size-7 items-center justify-center rounded-full font-semibold", isToday(d) && "bg-primary text-primary-foreground")}>
              {format(d, "d")}
            </span>
          </button>
        ),
        segments: segments.filter((s) => s.dayKey === key),
      };
    });
  }, [cursor, segments]);

  const dayColumns: GridColumn[] = useMemo(() => {
    const key = toDateKey(cursor);
    const daySegs = segments.filter((s) => s.dayKey === key);
    const shownHalls = halls.filter((h) => (hallId === ALL ? h.active || daySegs.some((s) => s.view.booking.event.hallId === h.id) : h.id === hallId));
    return shownHalls.flatMap((h): GridColumn[] => {
      const hallSegs = daySegs.filter((s) => s.view.booking.event.hallId === h.id);
      const portions = hallPortions(h);
      if (!portions.length) {
        return [
          {
            key: h.id,
            dayKey: key,
            hallId: h.id,
            header: (
              <span className="inline-flex items-center gap-2 font-medium">
                <span className="size-2.5 rounded-full" style={{ background: h.color }} />
                <span className="truncate">{h.name}</span>
              </span>
            ),
            segments: hallSegs,
          },
        ];
      }
      // Divided hall: one column per portion. Full-hall bookings appear in every portion they block.
      return portions.map((p) => ({
        key: `${h.id}:${p.id}`,
        dayKey: key,
        hallId: h.id,
        portionId: p.id,
        header: (
          <span className={cn("inline-flex min-w-0 flex-col items-center", !p.active && "opacity-60")}>
            <span className="inline-flex max-w-full items-center gap-2 font-medium">
              <span className="size-2.5 shrink-0 rounded-full" style={{ background: h.color }} />
              <span className="truncate">{h.name}</span>
            </span>
            <span className="truncate text-xs text-muted-foreground">
              {p.name}
              {!p.active && " · unavailable"}
            </span>
          </span>
        ),
        segments: hallSegs.filter((s) => !s.view.booking.event.portionId || s.view.booking.event.portionId === p.id),
      }));
    });
  }, [cursor, segments, halls, hallId]);

  return (
    <>
      <PageHeader
        title="Event Calendar"
        description="See every event across halls. Click an event for details, or an empty slot to book it."
        actions={
          <Button size="lg" onClick={() => newBooking(toDateKey(cursor))}>
            <Plus /> New Booking
          </Button>
        }
      />

      <div className="rounded-xl border bg-card shadow-xs">
        <div className="flex flex-col gap-3 border-b p-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="icon-lg" onClick={() => step(-1)} aria-label="Previous"><ChevronLeft /></Button>
            <Button variant="outline" size="lg" onClick={() => setCursor(new Date())}>Today</Button>
            <Button variant="outline" size="icon-lg" onClick={() => step(1)} aria-label="Next"><ChevronRight /></Button>
            <h2 className="ml-2 text-lg font-semibold">{title}</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="w-44">
              <DatePicker value={toDateKey(cursor)} onChange={(v) => setCursor(parseISO(v))} placeholder="Jump to date" />
            </div>
            <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)}>
              <TabsList>
                <TabsTrigger value="day">Day</TabsTrigger>
                <TabsTrigger value="week">Week</TabsTrigger>
                <TabsTrigger value="month">Month</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-b px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="grid gap-2 sm:grid-cols-3 lg:flex">
            <Select value={hallId} onValueChange={setHallId}>
              <SelectTrigger className="h-9! w-full lg:w-48" aria-label="Filter by hall"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All halls</SelectItem>
                {halls.map((h) => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="h-9! w-full lg:w-44" aria-label="Filter by event type"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All event types</SelectItem>
                {EVENT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-9! w-full lg:w-44" aria-label="Filter by status"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All active statuses</SelectItem>
                {BOOKING_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
            {BOOKING_STATUSES.map((s) => (
              <span key={s} className="inline-flex items-center gap-1.5">
                <span className={cn("size-2.5 rounded-full", bookingStatusStyles[s].dot)} />
                {s}
              </span>
            ))}
            {status === ALL && (
              <label className="inline-flex cursor-pointer items-center gap-1.5 text-muted-foreground">
                <input type="checkbox" checked={showCancelled} onChange={(e) => setShowCancelled(e.target.checked)} className="accent-primary" />
                Show cancelled
              </label>
            )}
          </div>
        </div>

        {mode === "month" && (
          <MonthView
            cursor={cursor}
            views={views}
            onSelect={setSelected}
            onDayClick={(k) => newBooking(k)}
            onShowDay={(k) => { setCursor(parseISO(k)); setMode("day"); }}
          />
        )}
        {mode === "week" && <TimeGrid columns={weekColumns} onSelect={setSelected} onSlotClick={newBooking} />}
        {mode === "day" &&
          (dayColumns.length ? (
            <TimeGrid columns={dayColumns} onSelect={setSelected} onSlotClick={newBooking} />
          ) : (
            <p className="p-10 text-center text-sm text-muted-foreground">No halls to show. Add a hall under Halls & Venues.</p>
          ))}
      </div>

      <EventDialog view={selected} onClose={() => setSelected(null)} currency={currency} />
    </>
  );
}
