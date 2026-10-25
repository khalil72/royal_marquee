"use client";

import { eachDayOfInterval, endOfMonth, endOfWeek, format, isSameMonth, isToday, startOfMonth, startOfWeek } from "date-fns";
import { Moon, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatTime, toDateKey } from "@/lib/format";
import type { BookingView } from "@/lib/hooks";
import { bookingStatusStyles } from "@/lib/ui";

const MAX_VISIBLE = 3;

export function MonthView({
  cursor,
  views,
  onSelect,
  onDayClick,
  onShowDay,
}: {
  cursor: Date;
  views: BookingView[];
  onSelect: (view: BookingView) => void;
  /** Create a booking on this day */
  onDayClick: (dayKey: string) => void;
  /** Open the day view */
  onShowDay: (dayKey: string) => void;
}) {
  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 }),
  });
  const byDay = new Map<string, BookingView[]>();
  for (const v of views) {
    const list = byDay.get(v.booking.event.date) ?? [];
    list.push(v);
    byDay.set(v.booking.event.date, list);
  }
  byDay.forEach((list) => list.sort((a, b) => a.start.getTime() - b.start.getTime()));

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[720px]">
        <div className="grid grid-cols-7 border-b bg-muted/40 text-center text-xs font-medium text-muted-foreground">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
            <div key={d} className="py-2">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((day) => {
            const key = toDateKey(day);
            const items = byDay.get(key) ?? [];
            const muted = !isSameMonth(day, cursor);
            return (
              <div
                key={key}
                className={cn("group min-h-32 border-b border-l p-1.5 first:border-l-0 [&:nth-child(7n+1)]:border-l-0", muted && "bg-muted/30")}
              >
                <div className="mb-1 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => onShowDay(key)}
                    className={cn(
                      "flex size-7 items-center justify-center rounded-full text-xs font-medium transition-colors hover:bg-muted",
                      muted && "text-muted-foreground",
                      isToday(day) && "bg-primary text-primary-foreground hover:bg-primary/90",
                    )}
                    aria-label={`Open ${format(day, "dd MMMM")} in day view`}
                  >
                    {format(day, "d")}
                  </button>
                  <button
                    type="button"
                    onClick={() => onDayClick(key)}
                    className="flex size-6 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:bg-primary/10 hover:text-primary focus-visible:opacity-100"
                    aria-label={`New booking on ${format(day, "dd MMMM")}`}
                    title="Create booking on this day"
                  >
                    <Plus className="size-3.5" />
                  </button>
                </div>
                <div className="space-y-1">
                  {items.slice(0, MAX_VISIBLE).map((v) => (
                    <button
                      key={v.booking.id}
                      type="button"
                      onClick={() => onSelect(v)}
                      className={cn(
                        "block w-full truncate rounded border border-l-[3px] border-transparent px-1.5 py-0.5 text-left text-[11px] leading-snug transition-shadow hover:shadow-sm",
                        bookingStatusStyles[v.booking.status].block,
                      )}
                      title={`${v.booking.event.title} · ${v.hall?.name} · ${v.customer?.name}`}
                    >
                      <span className="font-semibold">{formatTime(v.booking.event.startTime)}</span> {v.booking.event.title}
                      {v.booking.event.overnight && <Moon className="ml-0.5 inline size-2.5" />}
                      <span className="block truncate opacity-75">
                        <span className="mr-1 inline-block size-1.5 rounded-full align-middle" style={{ background: v.hall?.color }} />
                        {v.hall?.name}
                      </span>
                    </button>
                  ))}
                  {items.length > MAX_VISIBLE && (
                    <button type="button" onClick={() => onShowDay(key)} className="px-1 text-[11px] font-medium text-primary hover:underline">
                      +{items.length - MAX_VISIBLE} more
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
