import { addDays, startOfDay } from "date-fns";
import { toDateKey } from "@/lib/format";
import type { BookingView } from "@/lib/hooks";

export interface Segment {
  view: BookingView;
  dayKey: string;
  /** Minutes from midnight */
  start: number;
  end: number;
  continuesFromPrev: boolean;
  continuesToNext: boolean;
  lane: number;
  lanes: number;
}

const wallMinutes = (d: Date) => d.getHours() * 60 + d.getMinutes();

/** Split bookings into per-day segments (overnight events become two segments). */
export function toSegments(views: BookingView[]): Omit<Segment, "lane" | "lanes">[] {
  const out: Omit<Segment, "lane" | "lanes">[] = [];
  for (const view of views) {
    let cursor = view.start;
    while (cursor < view.end) {
      const dayStart = startOfDay(cursor);
      const nextDay = addDays(dayStart, 1);
      const segEnd = view.end < nextDay ? view.end : nextDay;
      out.push({
        view,
        dayKey: toDateKey(dayStart),
        // Wall-clock minutes, so DST-transition days still map onto a 24h grid
        start: wallMinutes(cursor),
        end: segEnd.getTime() === nextDay.getTime() ? 24 * 60 : wallMinutes(segEnd),
        continuesFromPrev: cursor > view.start,
        continuesToNext: segEnd < view.end,
      });
      cursor = segEnd;
    }
  }
  return out;
}

/** Assign side-by-side lanes to overlapping segments within one column. */
export function layoutLanes(segments: Omit<Segment, "lane" | "lanes">[]): Segment[] {
  const sorted = [...segments].sort((a, b) => a.start - b.start || b.end - a.end);
  const result: Segment[] = [];
  let cluster: Segment[] = [];
  let clusterEnd = -1;
  const flush = () => {
    const lanes = Math.max(1, ...cluster.map((s) => s.lane + 1));
    cluster.forEach((s) => (s.lanes = lanes));
    result.push(...cluster);
    cluster = [];
  };
  for (const seg of sorted) {
    if (seg.start >= clusterEnd && cluster.length) flush();
    const used = new Set(cluster.filter((c) => c.end > seg.start).map((c) => c.lane));
    let lane = 0;
    while (used.has(lane)) lane++;
    cluster.push({ ...seg, lane, lanes: 1 });
    clusterEnd = Math.max(clusterEnd, seg.end);
  }
  if (cluster.length) flush();
  return result;
}
