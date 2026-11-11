import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ParadoxFeedDto } from '../core/models/paradox.model';
import { AppStateService } from './app-state.service';
import { NotificationService } from './notification.service';
import { PARADOX_POLL_MS, ParadoxFeedStore } from './paradox-feed.store';

const paradox = (guid: string, overrides: Partial<ParadoxFeedDto> = {}): ParadoxFeedDto => ({
  guid, paradoxStatus: 'InQueue', paradoxType: 'GrandFatherParadox', description: 'desc', createdAt: new Date().toISOString(),
  tripGuid: 't1', tripName: 'Ancient Rome', tripType: 'Trip', managerGuid: 'm1', licensedAgentId: 1, agentId: null,
  tripStatus: 'Active', resolvedAt: null, resolvedByAgentId: null,
  dualLockRequired: false, licensedLocked: false, supportLocked: false, tripHasSupportAgent: false, queuePosition: 0, ...overrides,
});

describe('ParadoxFeedStore', () => {
  let store: ParadoxFeedStore;
  let http: HttpTestingController;
  let notifications: NotificationService;

  beforeEach(() => {
    vi.useFakeTimers();
    sessionStorage.clear();
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    store = TestBed.inject(ParadoxFeedStore);
    http = TestBed.inject(HttpTestingController);
    notifications = TestBed.inject(NotificationService);
    TestBed.inject(AppStateService).enterTimeMode(); // Time itself is notified about every paradox
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  /** Answers the pending feed poll; any agency reloads it triggers are acknowledged and ignored. */
  function flushFeed(list: ParadoxFeedDto[]): void {
    http.expectOne('/api/Paradox').flush(list);
    http.match(() => true).forEach(req => req.flush([]));
  }

  it('polls the feed and groups paradoxes by trip', () => {
    store.start();
    vi.advanceTimersByTime(0);
    flushFeed([paradox('a'), paradox('b', { tripGuid: 't2', paradoxStatus: 'Solved' })]);

    expect(store.paradoxes().length).toBe(2);
    expect(store.forTrip('t1').map(p => p.guid)).toEqual(['a']);
    expect(store.openCountForTrip('t2')).toBe(0);
  });

  it('notifies about paradoxes that appear at runtime, but not about the initial load', () => {
    store.start();
    vi.advanceTimersByTime(0);
    flushFeed([paradox('a')]);
    expect(notifications.toasts().length).toBe(0);

    vi.advanceTimersByTime(PARADOX_POLL_MS);
    flushFeed([paradox('new', { tripType: 'CriticalTrip' }), paradox('a')]);

    const toasts = notifications.toasts();
    expect(toasts.length).toBe(1);
    expect(toasts[0].tone).toBe('paradox');
    expect(toasts[0].message).toContain('escalated to Critical');
    expect(store.fresh().has('new')).toBe(true);
  });

  it('marks the feed offline when the backend is unreachable', () => {
    store.start();
    vi.advanceTimersByTime(0);
    http.expectOne('/api/Paradox').error(new ProgressEvent('error'), { status: 0 });
    expect(store.online()).toBe(false);
  });
});
