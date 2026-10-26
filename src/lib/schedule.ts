import { addDays, parseISO, set } from "date-fns";
import type { Booking, BookingStatus, EventDetails, Hall, HallPortion } from "./types";

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
export const OCCUPYING: BookingStatus[] = ["Pending", "Confirmed", "Completed"];
/** Statuses that firmly hold a hall and block any overlapping booking. */
export const FIRM: BookingStatus[] = ["Confirmed", "Completed"];

export interface ConflictResult {
  /** Overlapping confirmed/completed bookings: saving must be blocked. */
  blocking: Booking[];
  /** Overlapping pending (tentative) bookings: show a warning. */
  tentative: Booking[];
}

// ---------- Halls and portions ----------

/** Portions of a hall, or none when the hall is not divided. */
export function hallPortions(hall: Hall | undefined): HallPortion[] {
  return hall?.divided ? (hall.portions ?? []) : [];
}

/** Whether the whole hall can be booked at once. Undivided halls always can. */
export function canBookFullHall(hall: Hall | undefined) {
  return !hall?.divided || hall.allowFullBooking !== false;
}

export function findPortion(hall: Hall | undefined, portionId: string | undefined) {
  return portionId ? hall?.portions?.find((p) => p.id === portionId) : undefined;
}

/** "Royal Hall · Portion A", "Royal Hall · Full hall" (divided), or just "Royal Hall". */
export function spaceLabel(hall: Hall | undefined, portionId: string | undefined, fallback = "—") {
  if (!hall) return fallback;
  const portion = findPortion(hall, portionId);
  if (portion) return `${hall.name} · ${portion.name}`;
  if (portionId) return `${hall.name} · Removed portion`;
  return hall.divided ? `${hall.name} · Full hall` : hall.name;
}

/** Capacity and rent of what is being booked: a portion, or the full hall. */
export function spaceCapacity(hall: Hall | undefined, portionId: string | undefined) {
  return findPortion(hall, portionId)?.capacity ?? hall?.capacity ?? 0;
}
export function spaceRent(hall: Hall | undefined, portionId: string | undefined) {
  return findPortion(hall, portionId)?.rent ?? hall?.baseRent ?? 0;
}

type Space = Pick<EventDetails, "hallId" | "portionId">;

/**
 * Two bookings compete for space when they are in the same hall and either takes the full hall
 * or both take the same portion. Different portions of one hall can run at the same time.
 */
export function spacesOverlap(a: Space, b: Space) {
  if (a.hallId !== b.hallId) return false;
  if (!a.portionId || !b.portionId) return true;
  return a.portionId === b.portionId;
}

export function findConflicts(
  candidate: Pick<EventDetails, "hallId" | "portionId" | "date" | "startTime" | "endTime" | "overnight">,
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
      spacesOverlap(b.event, candidate) &&
      OCCUPYING.includes(b.status) &&
      intervalsOverlap(target, eventInterval(b.event)),
  );
  const blocking = overlapping.filter((b) => FIRM.includes(b.status));
  // A confirmed candidate overlapping a pending one is allowed but the pending one is flagged.
  const tentative = overlapping.filter((b) => !FIRM.includes(b.status));
  return { blocking, tentative };
}
