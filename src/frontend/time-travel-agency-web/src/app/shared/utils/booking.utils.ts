import { TripDto } from '../../core/models/trip.model';
import { isBookingOpen, isDeparted } from './date.utils';

export type BookingState = 'booked' | 'departed' | 'unavailable' | 'boarding' | 'bookable';

/** Single source of truth for what a customer can do with a trip (used by trip detail and the Continuum). */
export function bookingState(trip: TripDto, customerGuid: string | null, now = Date.now()): BookingState {
  if (customerGuid && trip.customers.some(c => c.guid === customerGuid)) return 'booked';
  if (isDeparted(trip.dateInRealLife, now)) return 'departed';
  if (trip.tripStatus !== 'Active') return 'unavailable';
  if (!isBookingOpen(trip.dateInRealLife, now)) return 'boarding';
  return 'bookable';
}
