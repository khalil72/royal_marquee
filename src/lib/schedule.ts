import { addDays, parseISO, set } from "date-fns";
import type { Booking, BookingStatus, EventDetails } from "./types";

type Timing = Pick<EventDetails, "date" | "startTime" | "endTime" | "overnight">;

export function timeToMinutes(time: string) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/** Duration in minutes, honouring events that run past midnight. */
export function eventDurationMinutes(startTime: string, endTime: string, overnight: boolean) {
  if (!startTime || !endTime) return 0;
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime) + (overnight ? 24 * 60 : 0);
  return end - start;
}

/** Returns an error message when the time range is invalid, otherwise null. */
export function validateTimeRange(startTime: string, endTime: string, overnight: boolean): string | null {
  if (!startTime || !endTime) return null;
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  if (!overnight && end <= start) {
    return "End time must be later than start time. Turn on “Ends next day” for events that run past midnight.";
  }
  if (overnight && end >= start) {
    return "An overnight event must end on the next day before its start time (max 24 hours).";
  }
  return null;
}

export function eventInterval(e: Timing) {
  const day = parseISO(e.date);
  const [sh, sm] = e.startTime.split(":").map(Number);
  const [eh, em] = e.endTime.split(":").map(Number);
  const start = set(day, { hours: sh, minutes: sm, seconds: 0, milliseconds: 0 });
  let end = set(day, { hours: eh, minutes: em, seconds: 0, milliseconds: 0 });
  if (e.overnight) end = addDays(end, 1);
  return { start, end };
}

export function intervalsOverlap(a: { start: Date; end: Date }, b: { start: Date; end: Date }) {
  return a.start < b.end && b.start < a.end;
}

/** Statuses that occupy a hall. Cancelled bookings free the slot. */
const OCCUPYING: BookingStatus[] = ["Pending", "Confirmed", "Completed"];
/** Statuses that firmly hold a hall and block any overlapping booking. */
const FIRM: BookingStatus[] = ["Confirmed", "Completed"];

export interface ConflictResult {
  /** Overlapping confirmed/completed bookings: saving must be blocked. */
  blocking: Booking[];
  /** Overlapping pending (tentative) bookings: show a warning. */
  tentative: Booking[];
}

export function findConflicts(
  candidate: Pick<EventDetails, "hallId" | "date" | "startTime" | "endTime" | "overnight">,
  candidateStatus: BookingStatus,
  bookings: Booking[],
  excludeId?: string,
): ConflictResult {
  const empty = { blocking: [], tentative: [] };
  if (candidateStatus === "Cancelled") return empty;
  if (!candidate.hallId || !candidate.date || !candidate.startTime || !candidate.endTime) return empty;
  if (validateTimeRange(candidate.startTime, candidate.endTime, candidate.overnight)) return empty;

  const target = eventInterval(candidate);
  const overlapping = bookings.filter(
    (b) =>
      b.id !== excludeId &&
      b.event.hallId === candidate.hallId &&
      OCCUPYING.includes(b.status) &&
      intervalsOverlap(target, eventInterval(b.event)),
  );
  const blocking = overlapping.filter((b) => FIRM.includes(b.status));
  // A confirmed candidate overlapping a pending one is allowed but the pending one is flagged.
  const tentative = overlapping.filter((b) => !FIRM.includes(b.status));
  return { blocking, tentative };
}
