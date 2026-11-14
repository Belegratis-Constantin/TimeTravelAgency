import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AgencyStore } from '../../../state/agency.store';
import { AppStateService, IdentityRole, ROLES } from '../../../state/app-state.service';
import { agentTypeLabel, epochLabel, fullName } from '../../utils/status.utils';
import { ModalComponent } from '../modal/modal.component';

interface IdentityOption {
  guid: string;
  title: string;
  subtitle: string;
  badge?: string;
  select: () => void;
}

/** Lets the user pick a real identity from the database for the requested role. */
@Component({
  selector: 'app-identity-picker-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ModalComponent],
  template: `
    <app-modal [title]="'Sign in as ' + roleLabel()" subtitle="Choose an identity from the agency records." [width]="440"
               (closed)="cancel()">
      @if (agency.initialLoading()) {
        <p class="muted">Loading…</p>
      } @else if (agency.error()) {
        <p class="text-error">{{ agency.error() }}</p>
        <button type="button" class="btn btn--sm" (click)="agency.refresh()">Retry</button>
      } @else {
        <ul class="options">
          @for (o of options(); track o.guid) {
            <li>
              <button type="button" class="option" [class.current]="o.guid === currentGuid()" (click)="o.select()">
                <span class="row row--between">
                  <strong>{{ o.title }}</strong>
                  @if (o.badge) { <span class="badge badge--brand">{{ o.badge }}</span> }
                </span>
                <span class="sub">{{ o.subtitle }}</span>
              </button>
            </li>
          } @empty {
            <li class="empty-hint">No {{ roleLabel().toLowerCase() }} records found.</li>
          }
        </ul>
      }

      <div modal-actions>
        @if (role() === 'customer') {
          <button type="button" class="btn btn--accent" (click)="register()">Register new traveller</button>
        }
        <button type="button" class="btn" (click)="cancel()">Cancel</button>
      </div>
    </app-modal>
  `,
  styles: `
    .options { list-style: none; margin: 0; padding: 2px; display: grid; gap: 6px; max-height: 340px; overflow-y: auto; }
    .option { display: grid; gap: 1px; width: 100%; text-align: left; padding: 9px 12px; background: var(--surface);
              border: 1px solid var(--border-subtle); border-radius: var(--radius); cursor: pointer; font-size: 13.5px;
              transition: border-color 0.15s, background 0.15s; }
    .option:hover { border-color: var(--border); background: var(--bg-raised); }
    .option.current { border-color: var(--brand); background: color-mix(in srgb, var(--brand) 6%, var(--surface)); }
    .sub { font-size: 12px; color: var(--text-muted); }
  `,
})
export class IdentityPickerModalComponent {
  protected readonly agency = inject(AgencyStore);
  private readonly state = inject(AppStateService);
  private readonly router = inject(Router);

  protected readonly role = computed(() => this.state.pendingRole() as IdentityRole);
  protected readonly roleLabel = computed(() => ROLES.find(r => r.role === this.role())?.label ?? '');

  protected readonly currentGuid = computed(() => {
    switch (this.role()) {
      case 'customer': return this.state.currentCustomer()?.guid;
      case 'agent': return this.state.currentAgent()?.guid;
      case 'manager': return this.state.currentManager()?.guid;
      case 'director': return this.state.currentDirector()?.guid;
    }
  });

  protected readonly options = computed((): IdentityOption[] => {
    switch (this.role()) {
      case 'customer':
        return this.agency.customers().map(c => ({
          guid: c.guid, title: fullName(c), subtitle: c.email,
          select: () => this.done(() => this.state.signInAsCustomer(c)),
        }));
      case 'agent':
        return this.agency.agents().map(a => ({
          guid: a.guid, title: fullName(a),
          subtitle: epochLabel(a.specialisationEpochId) ?? `Specialised in ${a.specialisationTime}`,
          badge: agentTypeLabel(a.agentType),
          select: () => this.done(() => this.state.signInAsAgent(a)),
        }));
      case 'manager':
        return this.agency.managers().map(m => ({
          guid: m.guid, title: fullName(m), subtitle: m.email,
          select: () => this.done(() => this.state.signInAsManager(m)),
        }));
      case 'director': {
        const d = this.agency.director();
        return d ? [{
          guid: d.guid, title: d.name,
          subtitle: `Oversees ${d.managerCount} manager${d.managerCount === 1 ? '' : 's'}`,
          select: () => this.done(() => this.state.signInAsDirector(d)),
        }] : [];
      }
    }
  });

  constructor() {
    this.agency.ensureLoaded();
  }

  protected register(): void {
    this.state.cancelPendingRole();
    this.state.joinModalOpen.set(true);
  }

  protected cancel(): void {
    this.state.cancelPendingRole();
    if (this.state.missingIdentity()) {
      this.state.fallbackToCustomer();
      this.router.navigateByUrl('/');
    }
  }

  private done(signIn: () => void): void {
    signIn();
    this.router.navigateByUrl(this.state.homeRoute());
  }
}
