import { computed, inject, Injectable, signal } from '@angular/core';
import { catchError, EMPTY, merge, Observable, Subject, switchMap, tap, timer } from 'rxjs';
import { ParadoxService } from '../core/services/paradox.service';
import { ParadoxFeedDto, ParadoxStatus, SpawnParadoxResultDto } from '../core/models/paradox.model';
import { toErrorMessage } from '../core/http/error-message';
import { isOpenParadox, paradoxMeta, paradoxTypeLabel, tripDisplayName } from '../shared/utils/status.utils';
import { AppStateService } from './app-state.service';
import { AgencyStore } from './agency.store';
import { NotificationService } from './notification.service';
import { findArrivals, isParadoxRelevant, RelevanceContext } from './paradox-relevance';

export const PARADOX_POLL_MS = 5000;
const HIGHLIGHT_MS = 15_000;

/**
 * Live view of all paradoxes. The backend creates paradoxes on its own at runtime
 * (ParadoxSimulationService), so this store polls the feed, keeps every view in sync and
 * notifies the user about new paradoxes that concern them.
 */
@Injectable({ providedIn: 'root' })
export class ParadoxFeedStore {
  private readonly api = inject(ParadoxService);
  private readonly app = inject(AppStateService);
  private readonly agency = inject(AgencyStore);
  private readonly notifications = inject(NotificationService);

  private readonly refresh$ = new Subject<void>();
  private known: Set<string> | null = null;
  private started = false;

  readonly paradoxes = signal<ParadoxFeedDto[]>([]);
  readonly online = signal(true);
  /** Paradoxes that appeared within the last few seconds (for highlighting). */
  readonly fresh = signal<ReadonlySet<string>>(new Set());
  /** Paradox whose status change is in flight. */
  readonly pendingStatus = signal<string | null>(null);

  readonly byTrip = computed(() => {
    const map = new Map<string, ParadoxFeedDto[]>();
    for (const p of this.paradoxes()) {
      const list = map.get(p.tripGuid);
      if (list) list.push(p);
      else map.set(p.tripGuid, [p]);
    }
    return map;
  });

  private readonly relevance = computed((): RelevanceContext => ({
    role: this.app.role(),
    bookedTripGuids: new Set(
      this.app.isCustomer() ? this.agency.scopedTrips().map(t => t.guid) : [],
    ),
    agentId: this.app.currentAgent()?.id ?? null,
    managerGuid: this.app.currentManager()?.guid ?? null,
  }));

  /** Paradoxes concerning the signed-in identity. */
  readonly scoped = computed(() => {
    const ctx = this.relevance();
    return this.paradoxes().filter(p => isParadoxRelevant(p, ctx));
  });
  readonly scopedOpenCount = computed(() => this.scoped().filter(isOpenParadox).length);

  start(): void {
    if (this.started) return;
    this.started = true;
    merge(timer(0, PARADOX_POLL_MS), this.refresh$)
      .pipe(
        switchMap(() =>
          this.api.getAll().pipe(
            tap({ error: () => this.online.set(false) }),
            catchError(() => EMPTY),
          ),
        ),
      )
      .subscribe(list => this.apply(list));
  }

  /** Re-polls immediately (after the user changed or created a paradox). */
  refresh(): void {
    this.refresh$.next();
  }

  /** Moves a paradox through its workflow. The backend only allows the manager owning the trip. */
  changeStatus(paradox: ParadoxFeedDto, status: ParadoxStatus): void {
    const managerGuid = this.app.currentManager()?.guid;
    this.pendingStatus.set(paradox.guid);
    this.api.changeStatus(paradox.guid, status, managerGuid).subscribe({
      next: () => {
        this.pendingStatus.set(null);
        // Optimistic local update; the next poll confirms it.
        this.paradoxes.update(list => list.map(p => (p.guid === paradox.guid ? { ...p, paradoxStatus: status } : p)));
        this.notifications.success('Paradox updated', `${paradoxTypeLabel(paradox.paradoxType)} is now ${paradoxMeta(status).label}.`);
      },
      error: err => {
        this.pendingStatus.set(null);
        this.notifications.error('Could not update paradox', toErrorMessage(err));
      },
    });
  }

  /** Tears a paradox into the given trip, or into a random active trip when no trip is given. */
  introduce(tripGuid?: string): Observable<SpawnParadoxResultDto> {
    const request = tripGuid ? this.api.addToTrip(tripGuid) : this.api.spawnRandom();
    return request.pipe(tap(() => this.refresh()));
  }

  forTrip(tripGuid: string): ParadoxFeedDto[] {
    return this.byTrip().get(tripGuid) ?? [];
  }

  openCountForTrip(tripGuid: string): number {
    return this.forTrip(tripGuid).filter(isOpenParadox).length;
  }

  private apply(list: ParadoxFeedDto[]): void {
    this.online.set(true);
    const arrivals = findArrivals(this.known, list);
    const previousTripTypes = new Map(this.paradoxes().map(p => [p.tripGuid, p.tripType]));

    this.paradoxes.set(list);
    this.known = new Set(list.map(p => p.guid));

    if (arrivals.length === 0) return;

    // New paradoxes can turn a trip critical — reload trips so types and counts are current.
    this.agency.refresh();
    this.markFresh(arrivals);

    const ctx = this.relevance();
    for (const p of arrivals.filter(a => isParadoxRelevant(a, ctx))) {
      const escalated = p.tripType === 'CriticalTrip' && previousTripTypes.get(p.tripGuid) === 'Trip';
      this.notifications.show({
        tone: 'paradox',
        title: `${paradoxTypeLabel(p.paradoxType)} detected`,
        message: `On “${tripDisplayName(p)}”${escalated ? ' — trip escalated to Critical' : ''}`,
        link: ['/trip', p.tripGuid],
      });
    }
  }

  private markFresh(arrivals: ParadoxFeedDto[]): void {
    const guids = arrivals.map(p => p.guid);
    this.fresh.update(set => new Set([...set, ...guids]));
    setTimeout(() => this.fresh.update(set => new Set([...set].filter(g => !guids.includes(g)))), HIGHLIGHT_MS);
  }
}
