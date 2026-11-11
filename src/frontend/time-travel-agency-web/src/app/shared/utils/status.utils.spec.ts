import { epochLabel, formatYear, initials, isOpenParadox, paradoxMeta, paradoxTypeLabel, starString, tripStatusMeta, tripTypeLabel } from './status.utils';

describe('status utils', () => {
  it('maps backend status strings to labels and tones', () => {
    expect(tripStatusMeta('Active')).toEqual({ label: 'Under way', tone: 'gold' });
    expect(tripStatusMeta('Scheduled')).toEqual({ label: 'Scheduled', tone: 'blue' });
    expect(paradoxMeta('InQueue')).toEqual({ label: 'In Queue', tone: 'amber' });
    expect(paradoxMeta('Unknown').tone).toBe('neutral');
  });

  it('labels all paradox types, including Information Paradox', () => {
    expect(paradoxTypeLabel('GrandFatherParadox')).toBe('Grandfather Paradox');
    expect(paradoxTypeLabel('InformationParadox')).toBe('Information Paradox');
  });

  it('treats every non-solved paradox as open', () => {
    expect(isOpenParadox({ paradoxStatus: 'Solved' })).toBe(false);
    expect(isOpenParadox({ paradoxStatus: 'Escalated' })).toBe(true);
    expect(isOpenParadox({ paradoxStatus: 'InProcess' })).toBe(true);
  });

  it('uses the TPH discriminator for trip types', () => {
    expect(tripTypeLabel('CriticalTrip')).toBe('Critical');
    expect(tripTypeLabel('Trip')).toBe('Standard');
  });

  it('formats years and epochs', () => {
    expect(formatYear(-44)).toBe('44 BCE');
    expect(formatYear(-2_500_000)).toBe('2.5M BCE');
    expect(formatYear(1865)).toBe('1865 CE');
    expect(epochLabel({ id: 1, name: 'Victorian Era', startYear: 1837, endYear: 1901 })).toBe('Victorian Era (1837 CE – 1901 CE)');
    expect(epochLabel(null)).toBeNull();
  });

  it('renders stars and initials', () => {
    expect(starString(3)).toBe('★★★☆☆');
    expect(starString(9)).toBe('★★★★★');
    expect(initials({ firstname: 'ada', lastname: 'lovelace' })).toBe('AL');
  });
});
