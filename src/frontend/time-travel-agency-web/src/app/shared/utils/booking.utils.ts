import { TripDto } from '../../core/models/trip.model';
import { CANCELLATION_CUTOFF_MS, isDeparted, tripsOverlap } from './date.utils';

/**
 * What a customer can do with a trip:
 * - `booked`     — already booked; `canCancel` tells whether it can still be cancelled
 * - `underway`   — departed and travelling right now (cannot be joined)
 * - `over`       — returned
 * - `unavailable`— cancelled
 * - `conflict`   — the customer is already on another trip during this time
 * - `bookable`   — scheduled, not departed, no conflict
 */
export type BookingKind = 'booked' | 'underway' | 'over' | 'unavailable' | 'conflict' | 'bookable';

export interface BookingInfo {
  kind: BookingKind;
  /** Only for `booked`: cancellation still allowed. */
  canCancel: boolean;
  /** Only for `conflict`: the overlapping trip. */
  conflictWith: TripDto | null;
}

const info = (kind: BookingKind, extra: Partial<BookingInfo> = {}): BookingInfo => ({
  kind, canCancel: false, conflictWith: null, ...extra,
});

/** Single source of truth for booking rules in the UI (mirrors Customer.AssignToTrip / CheckOutOfTrip). */
export function bookingInfo(
  trip: TripDto,
  customerGuid: string | null,
  allTrips: readonly TripDto[] = [],
  now = Date.now(),
): BookingInfo {
  const isBooked = !!customerGuid && trip.customers.some(c => c.guid === customerGuid);
  if (trip.tripStatus === 'Cancelled') return info('unavailable');

  if (isBooked) {
    const canCancel = trip.tripStatus === 'Scheduled' && Date.parse(trip.dateInRealLife) - now >= CANCELLATION_CUTOFF_MS;
    return info('booked', { canCancel });
  }

  if (trip.tripStatus === 'Completed' || Date.parse(trip.returnInRealLife) <= now) return info('over');
  if (trip.tripStatus === 'Active' || isDeparted(trip.dateInRealLife, now)) return info('underway');

  if (customerGuid) {
    const conflict = allTrips.find(other =>
      other.guid !== trip.guid
      && (other.tripStatus === 'Scheduled' || other.tripStatus === 'Active')
      && other.customers.some(c => c.guid === customerGuid)
      && tripsOverlap(other, trip),
    );
    if (conflict) return info('conflict', { conflictWith: conflict });
  }
  return info('bookable');
}

/** Shorthand used by filters. */
export function bookingState(trip: TripDto, customerGuid: string | null, allTrips: readonly TripDto[] = [], now = Date.now()): BookingKind {
  return bookingInfo(trip, customerGuid, allTrips, now).kind;
}
