/** Bookings close this long before departure (mirrors TripService.TryBookTrip in the backend). */
export const BOOKING_CUTOFF_MS = 3_600_000;

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

export function formatDateOnly(iso: string): string {
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export type Urgency = 'past' | 'soon' | 'later';

export interface TimeUntil {
  label: string;
  urgency: Urgency;
}

export function timeUntil(iso: string, now = Date.now()): TimeUntil {
  const diff = new Date(iso).getTime() - now;
  if (diff <= 0) return { label: 'Departed', urgency: 'past' };

  const mins = Math.round(diff / 60_000);
  if (mins < 60) return { label: `Departs in ${mins}m`, urgency: 'soon' };

  const hours = Math.floor(diff / 3_600_000);
  if (hours < 24) return { label: `Departs in ${hours}h ${mins % 60}m`, urgency: 'soon' };

  return { label: `Departs in ${Math.floor(hours / 24)}d`, urgency: 'later' };
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

export function isBookingOpen(iso: string, now = Date.now()): boolean {
  return new Date(iso).getTime() - now > BOOKING_CUTOFF_MS;
}

export function isDeparted(iso: string, now = Date.now()): boolean {
  return new Date(iso).getTime() <= now;
}
