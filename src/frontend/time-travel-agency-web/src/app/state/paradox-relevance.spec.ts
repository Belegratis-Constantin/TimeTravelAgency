import { ParadoxFeedDto } from '../core/models/paradox.model';
import { findArrivals, isParadoxRelevant, RelevanceContext } from './paradox-relevance';

const paradox = (overrides: Partial<ParadoxFeedDto> = {}): ParadoxFeedDto => ({
  guid: 'p1', paradoxStatus: 'InQueue', paradoxType: 'BootstrapParadox', description: '', createdAt: '2026-01-01T00:00:00Z',
  tripGuid: 't1', tripName: 'Rome', tripType: 'Trip', managerGuid: 'm1', licensedAgentId: 7, agentId: 3,
  tripStatus: 'Active', resolvedAt: null, resolvedByAgentId: null, ...overrides,
});

const ctx = (overrides: Partial<RelevanceContext>): RelevanceContext => ({
  role: 'customer', agentId: null, managerGuid: null, ...overrides,
});

describe('isParadoxRelevant', () => {
  it('customers are never told about paradoxes', () => {
    expect(isParadoxRelevant(paradox(), ctx({ role: 'customer' }))).toBe(false);
  });

  it('agents see paradoxes on trips they lead or support', () => {
    expect(isParadoxRelevant(paradox(), ctx({ role: 'agent', agentId: 7 }))).toBe(true);
    expect(isParadoxRelevant(paradox(), ctx({ role: 'agent', agentId: 3 }))).toBe(true);
    expect(isParadoxRelevant(paradox(), ctx({ role: 'agent', agentId: 99 }))).toBe(false);
  });

  it('managers see their own trips, director and time see everything', () => {
    expect(isParadoxRelevant(paradox(), ctx({ role: 'manager', managerGuid: 'm1' }))).toBe(true);
    expect(isParadoxRelevant(paradox(), ctx({ role: 'manager', managerGuid: 'm2' }))).toBe(false);
    expect(isParadoxRelevant(paradox(), ctx({ role: 'director' }))).toBe(true);
    expect(isParadoxRelevant(paradox(), ctx({ role: 'time' }))).toBe(true);
  });
});

describe('findArrivals', () => {
  it('reports nothing on the very first load', () => {
    expect(findArrivals(null, [paradox()])).toEqual([]);
  });

  it('returns paradoxes that were not known before', () => {
    const next = [paradox({ guid: 'new' }), paradox({ guid: 'p1' })];
    expect(findArrivals(new Set(['p1']), next).map(p => p.guid)).toEqual(['new']);
  });
});
