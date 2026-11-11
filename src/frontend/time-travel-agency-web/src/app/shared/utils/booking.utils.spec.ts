import { TripDto } from '../../core/models/trip.model';
import { bookingInfo, bookingState } from './booking.utils';

const NOW = Date.parse('2026-06-01T12:00:00Z');
const HOUR = 3_600_000;

function trip(overrides: Partial<TripDto> = {}, startOffset = 48 * HOUR, durationHours = 4): TripDto {
  const start = NOW + startOffset;
  return {
    guid: 't1', dateInRealLife: new Date(start).toISOString(), tripName: 'Ancient Rome', tripType: 'Trip',
    tripStatus: 'Scheduled', licensedAgentId: 1, managerId: 1, paradoxes: [], customers: [], reports: [], reviews: [],
    agentId: null, managerGuid: 'm1', durationMinutes: durationHours * 60,
    returnInRealLife: new Date(start + durationHours * HOUR).toISOString(), ...overrides,
  };
}
const customer = (guid: string) => ({ guid }) as TripDto['customers'][number];

describe('bookingInfo', () => {
  it('is bookable for scheduled future trips', () => {
    expect(bookingState(trip(), 'c1', [], NOW)).toBe('bookable');
  });

  it('recognises an existing booking and whether it can still be cancelled', () => {
    const booked = trip({ customers: [customer('c1')] });
    expect(bookingInfo(booked, 'c1', [], NOW)).toMatchObject({ kind: 'booked', canCancel: true });
    expect(bookingState(booked, 'c2', [], NOW)).toBe('bookable');

    const soon = trip({ customers: [customer('c1')] }, 30 * 60_000);
    expect(bookingInfo(soon, 'c1', [], NOW)).toMatchObject({ kind: 'booked', canCancel: false });
  });

  it('can still be booked shortly before departure', () => {
    expect(bookingState(trip({}, 10 * 60_000), 'c1', [], NOW)).toBe('bookable');
  });

  it('reports trips under way, over and cancelled', () => {
    expect(bookingState(trip({ tripStatus: 'Active' }, -HOUR), 'c1', [], NOW)).toBe('underway');
    expect(bookingState(trip({ tripStatus: 'Completed' }, -10 * HOUR), 'c1', [], NOW)).toBe('over');
    expect(bookingState(trip({ tripStatus: 'Cancelled' }), 'c1', [], NOW)).toBe('unavailable');
  });

  it('detects an overlapping booking of the same customer', () => {
    const other = trip({ guid: 't2', tripName: 'Paris', customers: [customer('c1')] }, 46 * HOUR, 4);
    const result = bookingInfo(trip(), 'c1', [other], NOW);
    expect(result.kind).toBe('conflict');
    expect(result.conflictWith?.guid).toBe('t2');

    const backToBack = trip({ guid: 't3', customers: [customer('c1')] }, 44 * HOUR, 4);
    expect(bookingState(trip(), 'c1', [backToBack], NOW)).toBe('bookable');
  });
});
