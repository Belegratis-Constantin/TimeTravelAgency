import { computed, inject, Injectable, signal } from '@angular/core';
import { catchError, forkJoin, map, of, Subject, switchMap } from 'rxjs';
import { TripService } from '../core/services/trip.service';
import { AgentService } from '../core/services/agent.service';
import { CustomerService } from '../core/services/customer.service';
import { ManagerService } from '../core/services/manager.service';
import { DirectorService } from '../core/services/director.service';
import { CustomerDto, TripDto } from '../core/models/trip.model';
import { AgentDto } from '../core/models/agent.model';
import { ManagerWithIdDto } from '../core/models/manager.model';
import { DirectorDto } from '../core/models/director.model';
import { toErrorMessage } from '../core/http/error-message';
import { fullName } from '../shared/utils/status.utils';
import { AppStateService } from './app-state.service';

type LoadStatus = 'idle' | 'loading' | 'ready' | 'error';

interface AgencySnapshot {
  trips: TripDto[];
  agents: AgentDto[];
  customers: CustomerDto[];
  managers: ManagerWithIdDto[];
  director: DirectorDto | null;
}

type LoadResult = { ok: true; data: AgencySnapshot } | { ok: false; error: unknown };

/**
 * Shared, signal-based cache of the agency's master data (trips, staff, customers).
 * Pages read from here instead of fetching on their own, so data is loaded once and
 * every view updates together after a mutation calls {@link refresh}.
 */
@Injectable({ providedIn: 'root' })
export class AgencyStore {
  private readonly tripApi = inject(TripService);
  private readonly agentApi = inject(AgentService);
  private readonly customerApi = inject(CustomerService);
  private readonly managerApi = inject(ManagerService);
  private readonly directorApi = inject(DirectorService);
  private readonly app = inject(AppStateService);

  private readonly reload$ = new Subject<void>();

  readonly trips = signal<TripDto[]>([]);
  readonly agents = signal<AgentDto[]>([]);
  readonly customers = signal<CustomerDto[]>([]);
  readonly managers = signal<ManagerWithIdDto[]>([]);
  readonly director = signal<DirectorDto | null>(null);

  readonly status = signal<LoadStatus>('idle');
  readonly error = signal<string | null>(null);
  /** True only for the very first load; background refreshes keep the current data visible. */
  readonly initialLoading = computed(() => this.status() === 'loading' && this.trips().length === 0);

  readonly agentsById = computed(() => new Map(this.agents().map(a => [a.id, a])));
  readonly tripsByGuid = computed(() => new Map(this.trips().map(t => [t.guid, t])));

  /** Trips that belong to the signed-in identity (what "my trips" means for each role). */
  readonly scopedTrips = computed((): TripDto[] => {
    const trips = this.trips();
    switch (this.app.role()) {
      case 'customer': {
        const guid = this.app.currentCustomer()?.guid;
        return guid ? trips.filter(t => t.customers.some(c => c.guid === guid)) : [];
      }
      case 'agent': {
        const id = this.app.currentAgent()?.id;
        return id === undefined ? [] : trips.filter(t => t.licensedAgentId === id || t.agentId === id);
      }
      case 'manager': {
        const guid = this.app.currentManager()?.guid;
        return guid ? trips.filter(t => t.managerGuid === guid) : [];
      }
      default:
        return trips;
    }
  });

  constructor() {
    this.reload$
      .pipe(
        switchMap(() =>
          forkJoin({
            trips: this.tripApi.getAll(),
            agents: this.agentApi.getAll(),
            customers: this.customerApi.getAll(),
            managers: this.managerApi.getAllWithId(),
            director: this.directorApi.get().pipe(catchError(() => of(null))),
          }).pipe(
            map((data): LoadResult => ({ ok: true, data })),
            catchError(error => of<LoadResult>({ ok: false, error })),
          ),
        ),
      )
      .subscribe(result => (result.ok ? this.applySnapshot(result.data) : this.applyError(result.error)));
  }

  /** Loads data once; safe to call from every page. */
  ensureLoaded(): void {
    if (this.status() === 'idle' || this.status() === 'error') this.refresh();
  }

  refresh(): void {
    this.status.set('loading');
    this.reload$.next();
  }

  agentName(id: number | null | undefined): string | null {
    if (id === null || id === undefined) return null;
    const agent = this.agentsById().get(id);
    return agent ? fullName(agent) : `Agent #${id}`;
  }

  private applySnapshot(data: AgencySnapshot): void {
    this.trips.set(data.trips);
    this.agents.set(data.agents);
    this.customers.set(data.customers);
    this.managers.set(data.managers);
    this.director.set(data.director);
    this.syncIdentities();
    this.error.set(null);
    this.status.set('ready');
  }

  private applyError(error: unknown): void {
    this.error.set(toErrorMessage(error, 'Could not load agency data.'));
    this.status.set('error');
  }

  /** The backend reseeds on restart, so a stored identity may be stale: refresh it or sign it out. */
  private syncIdentities(): void {
    const { currentCustomer, currentAgent, currentManager, currentDirector } = this.app;
    const customer = currentCustomer();
    const agent = currentAgent();
    const manager = currentManager();
    const director = currentDirector();
    this.app.refreshIdentity({
      customer: customer ? this.customers().find(c => c.guid === customer.guid) ?? null : null,
      agent: agent ? this.agents().find(a => a.guid === agent.guid) ?? null : null,
      manager: manager ? this.managers().find(m => m.guid === manager.guid) ?? null : null,
      director: director && this.director()?.guid === director.guid ? this.director() : null,
    });
  }
}
