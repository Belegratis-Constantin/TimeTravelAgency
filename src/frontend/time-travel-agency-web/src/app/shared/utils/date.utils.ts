/** Bookings can be cancelled until this long before departure (mirrors Customer.CancellationCutoff in the backend). */
export const CANCELLATION_CUTOFF_MS = 3_600_000;

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

export function formatDateOnly(iso: string): string {
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/** "45m", "3h 20m", "2d 4h". */
export function formatDuration(ms: number): string {
  const mins = Math.max(0, Math.round(ms / 60_000));
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return mins % 60 ? `${hours}h ${mins % 60}m` : `${hours}h`;
  const days = Math.floor(hours / 24);
  return hours % 24 ? `${days}d ${hours % 24}h` : `${days}d`;
}

export type Urgency = 'past' | 'soon' | 'later' | 'live';

export interface TimeUntil {
  label: string;
  urgency: Urgency;
}

export function timeUntil(iso: string, now = Date.now()): TimeUntil {
  const diff = new Date(iso).getTime() - now;
  if (diff <= 0) return { label: 'Departed', urgency: 'past' };
  const label = `Departs in ${formatDuration(diff)}`;
  return { label, urgency: diff < 24 * 3_600_000 ? 'soon' : 'later' };
}

/** Departure / return countdown for a trip, depending on where it is in its lifecycle. */
export function tripTiming(
  trip: { dateInRealLife: string; returnInRealLife: string; tripStatus: string },
  now = Date.now(),
): TimeUntil {
  if (trip.tripStatus === 'Cancelled') return { label: 'Cancelled', urgency: 'past' };
  const start = new Date(trip.dateInRealLife).getTime();
  const end = new Date(trip.returnInRealLife).getTime();
  if (now < start) return timeUntil(trip.dateInRealLife, now);
  if (now < end && trip.tripStatus !== 'Completed') return { label: `Under way · returns in ${formatDuration(end - now)}`, urgency: 'live' };
  return { label: `Returned ${formatDateOnly(trip.returnInRealLife)}`, urgency: 'past' };
}

/** "just now", "3 min ago", "2 h ago", or a date for anything older than a day. */
export function relativeTime(iso: string, now = Date.now()): string {
  const diff = Math.max(0, now - new Date(iso).getTime());
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  return formatDateOnly(iso);
}

export function isDeparted(iso: string, now = Date.now()): boolean {
  return new Date(iso).getTime() <= now;
}

/** Whether two trips share real-life time (start inclusive, end exclusive) — mirrors Trip.OverlapsWith. */
export function tripsOverlap(
  a: { dateInRealLife: string; returnInRealLife: string },
  b: { dateInRealLife: string; returnInRealLife: string },
): boolean {
  return Date.parse(a.dateInRealLife) < Date.parse(b.returnInRealLife)
    && Date.parse(b.dateInRealLife) < Date.parse(a.returnInRealLife);
}
