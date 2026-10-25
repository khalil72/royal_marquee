"use client";

import { useEffect, useRef } from "react";
import { isToday, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { formatTime } from "@/lib/format";
import type { BookingView } from "@/lib/hooks";
import { bookingStatusStyles } from "@/lib/ui";
import { layoutLanes, type Segment } from "./utils";

const HOUR_PX = 52;
const HOURS = Array.from({ length: 24 }, (_, h) => h);

export interface GridColumn {
  key: string;
  /** yyyy-MM-dd for this column */
  dayKey: string;
  header: React.ReactNode;
  segments: Omit<Segment, "lane" | "lanes">[];
  hallId?: string;
}

const hourLabel = (h: number) => `${h % 12 === 0 ? 12 : h % 12} ${h < 12 ? "AM" : "PM"}`;

export function TimeGrid({
  columns,
  onSelect,
  onSlotClick,
}: {
  columns: GridColumn[];
  onSelect: (view: BookingView) => void;
  onSlotClick: (dayKey: string, hour: number, hallId?: string) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // Most events are afternoon/evening; start the view at 10 AM
    scrollRef.current?.scrollTo({ top: HOUR_PX * 10 });
  }, []);

  return (
    <div className="overflow-x-auto">
      <div style={{ minWidth: Math.max(640, columns.length * 140 + 64) }}>
        <div className="sticky top-0 z-10 grid border-b bg-card" style={{ gridTemplateColumns: `64px repeat(${columns.length}, minmax(0,1fr))` }}>
          <div />
          {columns.map((c) => (
            <div key={c.key} className="border-l px-2 py-2 text-center text-sm">{c.header}</div>
          ))}
        </div>
        <div ref={scrollRef} className="max-h-[68vh] overflow-y-auto">
          <div className="relative grid" style={{ gridTemplateColumns: `64px repeat(${columns.length}, minmax(0,1fr))` }}>
            <div>
              {HOURS.map((h) => (
                <div key={h} className="relative pr-2 text-right text-[11px] text-muted-foreground" style={{ height: HOUR_PX }}>
                  <span className="relative -top-2">{h === 0 ? "" : hourLabel(h)}</span>
                </div>
              ))}
            </div>
            {columns.map((col) => {
              const laid = layoutLanes(col.segments);
              const today = isToday(parseISO(col.dayKey));
              return (
                <div key={col.key} className={cn("relative border-l", today && "bg-primary/[0.03]")}>
                  {HOURS.map((h) => (
                    <button
                      key={h}
                      type="button"
                      aria-label={`New booking at ${hourLabel(h)}`}
                      onClick={() => onSlotClick(col.dayKey, h, col.hallId)}
                      className="block w-full border-b border-dashed border-border/70 transition-colors hover:bg-primary/5"
                      style={{ height: HOUR_PX }}
                    />
                  ))}
                  {laid.map((s) => {
                    const st = bookingStatusStyles[s.view.booking.status];
                    const top = (s.start / 60) * HOUR_PX;
                    const height = Math.max(22, ((s.end - s.start) / 60) * HOUR_PX - 2);
                    const width = 100 / s.lanes;
                    return (
                      <button
                        key={`${s.view.booking.id}-${s.dayKey}`}
                        type="button"
                        onClick={() => onSelect(s.view)}
                        className={cn(
                          "absolute flex flex-col items-stretch justify-start overflow-hidden rounded-md border border-l-4 border-transparent px-1.5 py-1 text-left text-[11px] leading-tight shadow-xs transition-shadow hover:z-10 hover:shadow-md",
                          st.block,
                        )}
                        style={{ top, height, left: `calc(${s.lane * width}% + 2px)`, width: `calc(${width}% - 4px)` }}
                      >
                        <p className="truncate font-semibold">
                          {s.continuesFromPrev && "↳ "}
                          {s.view.booking.event.title}
                        </p>
                        <p className="truncate opacity-80">
                          {formatTime(s.view.booking.event.startTime)} – {formatTime(s.view.booking.event.endTime)}
                          {s.continuesToNext && " →"}
                        </p>
                        {height > 50 && (
                          <>
                            <p className="truncate opacity-80">{s.view.hall?.name}</p>
                            <p className="truncate opacity-80">{s.view.customer?.name}</p>
                          </>
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
