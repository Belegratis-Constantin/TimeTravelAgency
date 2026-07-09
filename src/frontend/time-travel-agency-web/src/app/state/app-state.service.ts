import { computed, Injectable, signal } from '@angular/core';
import { CustomerDto } from '../core/models/trip.model';
import { ManagerWithIdDto } from '../core/models/manager.model';
import { AgentDto } from '../core/models/agent.model';
import { DirectorDto } from '../core/models/director.model';

export type Role = 'customer' | 'agent' | 'manager' | 'director' | 'time';

@Injectable({ providedIn: 'root' })
export class AppStateService {
  readonly role = signal<Role>('customer');
  readonly currentCustomer = signal<CustomerDto | null>(null);
  readonly currentManager = signal<ManagerWithIdDto | null>(null);
  readonly currentAgent = signal<AgentDto | null>(null);
  readonly currentDirector = signal<DirectorDto | null>(null);
  readonly roleMenuOpen = signal(false);
  readonly pendingRole = signal<Role | null>(null);

  readonly isCustomer = computed(() => this.role() === 'customer');
  readonly isAgent = computed(() => this.role() === 'agent');
  readonly isManager = computed(() => this.role() === 'manager');
  readonly isDirector = computed(() => this.role() === 'director');
  readonly isTime = computed(() => this.role() === 'time');

  readonly roleLabel = computed(() => {
    const r = this.role();
    if (r === 'customer') {
      const c = this.currentCustomer();
      return c ? `${c.firstname} ${c.lastname}` : 'Customer';
    }
    if (r === 'agent') {
      const a = this.currentAgent();
      return a ? `${a.firstname} ${a.lastname}` : 'Licensed Agent';
    }
    if (r === 'director') {
      const d = this.currentDirector();
      return d ? d.name : 'Director';
    }
    if (r === 'time') return '⧗ TIME ITSELF';
    const m = this.currentManager();
    return m ? `${m.firstname} ${m.lastname}` : 'Manager';
  });

  setCustomer(customer: CustomerDto): void {
    this.currentCustomer.set(customer);
    this.role.set('customer');
    this.roleMenuOpen.set(false);
    this.pendingRole.set(null);
  }

  setManager(manager: ManagerWithIdDto): void {
    this.currentManager.set(manager);
    this.role.set('manager');
    this.roleMenuOpen.set(false);
    this.pendingRole.set(null);
  }

  setAgent(agent: AgentDto): void {
    this.currentAgent.set(agent);
    this.role.set('agent');
    this.roleMenuOpen.set(false);
    this.pendingRole.set(null);
  }

  setDirector(director: DirectorDto): void {
    this.currentDirector.set(director);
    this.role.set('director');
    this.roleMenuOpen.set(false);
    this.pendingRole.set(null);
  }

  enterTimeMode(): void {
    this.role.set('time');
    this.roleMenuOpen.set(false);
    this.pendingRole.set(null);
  }

  requestRole(role: Role): void {
    this.pendingRole.set(role);
    this.roleMenuOpen.set(false);
  }

  cancelPendingRole(): void {
    this.pendingRole.set(null);
  }

  toggleRoleMenu(): void {
    this.roleMenuOpen.update(v => !v);
  }

  closeRoleMenu(): void {
    this.roleMenuOpen.set(false);
  }
}
