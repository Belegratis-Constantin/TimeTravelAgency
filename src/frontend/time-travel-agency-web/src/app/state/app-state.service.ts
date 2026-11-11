import { computed, Injectable, signal } from '@angular/core';
import { CustomerDto } from '../core/models/trip.model';
import { ManagerWithIdDto } from '../core/models/manager.model';
import { AgentDto } from '../core/models/agent.model';
import { DirectorDto } from '../core/models/director.model';
import { fullName } from '../shared/utils/status.utils';

export type Role = 'customer' | 'agent' | 'manager' | 'director' | 'time';

/** Roles that require picking a real identity from the database. */
export type IdentityRole = Exclude<Role, 'time'>;

export interface RoleDefinition {
  role: Role;
  label: string;
  home: string;
}

export const ROLES: readonly RoleDefinition[] = [
  { role: 'customer', label: 'Customer', home: '/' },
  { role: 'agent', label: 'Agent', home: '/missions' },
  { role: 'manager', label: 'Manager', home: '/dashboard' },
  { role: 'director', label: 'Director', home: '/director' },
  { role: 'time', label: 'Time Itself', home: '/loom' },
];

interface Session {
  role: Role;
  customer: CustomerDto | null;
  agent: AgentDto | null;
  manager: ManagerWithIdDto | null;
  director: DirectorDto | null;
}

const STORAGE_KEY = 'tta_session';

/**
 * Who is using the app right now. The selected identity survives reloads (sessionStorage),
 * which matters because the backend's data — and therefore every GUID — is recreated on restart;
 * stale identities are dropped by {@link AgencyStore} once fresh data arrives.
 */
@Injectable({ providedIn: 'root' })
export class AppStateService {
  private readonly session = signal<Session>(restore());

  readonly role = computed(() => this.session().role);
  readonly currentCustomer = computed(() => this.session().customer);
  readonly currentAgent = computed(() => this.session().agent);
  readonly currentManager = computed(() => this.session().manager);
  readonly currentDirector = computed(() => this.session().director);

  /** Role whose identity picker is currently open. */
  readonly pendingRole = signal<IdentityRole | null>(null);
  readonly joinModalOpen = signal(false);

  readonly isCustomer = computed(() => this.role() === 'customer');
  readonly isAgent = computed(() => this.role() === 'agent');
  readonly isManager = computed(() => this.role() === 'manager');
  readonly isDirector = computed(() => this.role() === 'director');
  readonly isTime = computed(() => this.role() === 'time');

  readonly roleDefinition = computed(() => ROLES.find(r => r.role === this.role()) ?? ROLES[0]);
  readonly homeRoute = computed(() => this.roleDefinition().home);

  /** Name of the signed-in identity, or the role label for guests / Time. */
  readonly displayName = computed(() => {
    const s = this.session();
    switch (s.role) {
      case 'customer': return s.customer ? fullName(s.customer) : 'Guest';
      case 'agent': return s.agent ? fullName(s.agent) : 'Agent';
      case 'manager': return s.manager ? fullName(s.manager) : 'Manager';
      case 'director': return s.director?.name ?? 'Director';
      case 'time': return 'Time Itself';
    }
  });

  hasIdentity(role: Role): boolean {
    const s = this.session();
    switch (role) {
      case 'customer': return s.customer !== null;
      case 'agent': return s.agent !== null;
      case 'manager': return s.manager !== null;
      case 'director': return s.director !== null;
      case 'time': return true;
    }
  }

  signInAsCustomer(customer: CustomerDto): void { this.update({ role: 'customer', customer }); }
  signInAsAgent(agent: AgentDto): void { this.update({ role: 'agent', agent }); }
  signInAsManager(manager: ManagerWithIdDto): void { this.update({ role: 'manager', manager }); }
  signInAsDirector(director: DirectorDto): void { this.update({ role: 'director', director }); }
  enterTimeMode(): void { this.update({ role: 'time' }); }
  /** Falls back to browsing as customer (signed-in customer is kept, otherwise guest). */
  fallbackToCustomer(): void { this.update({ role: 'customer' }); }

  /** The current role needs a real identity but none is selected (e.g. after a backend restart). */
  readonly missingIdentity = computed(() => {
    const role = this.role();
    return role !== 'customer' && role !== 'time' && !this.hasIdentity(role);
  });

  /** Keeps the stored identity in sync with freshly loaded data (or drops it if it no longer exists). */
  refreshIdentity(patch: Partial<Omit<Session, 'role'>>): void {
    this.session.update(s => ({ ...s, ...patch }));
    persist(this.session());
  }

  requestRole(role: IdentityRole): void { this.pendingRole.set(role); }
  cancelPendingRole(): void { this.pendingRole.set(null); }

  private update(patch: Partial<Session>): void {
    this.session.update(s => ({ ...s, ...patch }));
    this.pendingRole.set(null);
    persist(this.session());
  }
}

function emptySession(): Session {
  return { role: 'customer', customer: null, agent: null, manager: null, director: null };
}

function restore(): Session {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? { ...emptySession(), ...(JSON.parse(raw) as Partial<Session>) } : emptySession();
  } catch {
    return emptySession();
  }
}

function persist(session: Session): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    /* storage unavailable (private mode) — the session simply won't survive a reload */
  }
}
