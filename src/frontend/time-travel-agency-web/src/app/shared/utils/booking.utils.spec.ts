import { TripDto } from '../../core/models/trip.model';
import { bookingState } from './booking.utils';

const NOW = Date.parse('2026-06-01T12:00:00Z');
const HOUR = 3_600_000;

function trip(overrides: Partial<TripDto> = {}): TripDto {
  return {
    guid: 't1', dateInRealLife: new Date(NOW + 48 * HOUR).toISOString(), tripName: 'Ancient Rome', tripType: 'Trip',
    tripStatus: 'Active', licensedAgentId: 1, managerId: 1, paradoxes: [], customers: [], reports: [], reviews: [],
    agentId: null, managerGuid: 'm1', ...overrides,
  };
}

describe('bookingState', () => {
  it('is bookable for active future trips', () => {
    expect(bookingState(trip(), 'c1', NOW)).toBe('bookable');
  });

  it('recognises an existing booking of the customer', () => {
    const booked = trip({ customers: [{ guid: 'c1' } as TripDto['customers'][number]] });
    expect(bookingState(booked, 'c1', NOW)).toBe('booked');
    expect(bookingState(booked, 'c2', NOW)).toBe('bookable');
  });

  it('closes boarding one hour before departure', () => {
    expect(bookingState(trip({ dateInRealLife: new Date(NOW + 30 * 60_000).toISOString() }), 'c1', NOW)).toBe('boarding');
  });

  it('reports departed and unavailable trips', () => {
    expect(bookingState(trip({ dateInRealLife: new Date(NOW - HOUR).toISOString() }), 'c1', NOW)).toBe('departed');
    expect(bookingState(trip({ tripStatus: 'Cancelled' }), 'c1', NOW)).toBe('unavailable');
  });
});
