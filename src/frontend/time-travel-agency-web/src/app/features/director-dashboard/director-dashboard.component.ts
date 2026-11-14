import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { AppStateService } from '../../state/app-state.service';
import { AgencyStore } from '../../state/agency.store';
import { ParadoxFeedStore } from '../../state/paradox-feed.store';
import { NotificationService } from '../../state/notification.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { StatTile, StatTilesComponent } from '../../shared/components/stat-tile/stat-tile.component';
import { agentTypeLabel, fullName, isOpenParadox } from '../../shared/utils/status.utils';
import { CreateManagerModalComponent } from '../modals/create-manager-modal/create-manager-modal.component';
import { IconComponent } from '../../shared/components/icon/icon.component';

/** System-wide oversight for the director. All numbers update live with the stores. */
@Component({
  selector: 'app-director-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageHeaderComponent, StatTilesComponent, CreateManagerModalComponent, IconComponent],
  template: `
    <div class="page">
      <app-page-header eyebrow="Director · Command Centre" [title]="state.displayName()"
                       subtitle="System-wide oversight — all operations, all eras.">
        <button type="button" class="btn btn--primary" (click)="createOpen.set(true)"><app-icon name="plus" /> Appoint manager</button>
      </app-page-header>

      @if (agency.initialLoading()) {
        <p class="state-msg">Loading command data…</p>
      } @else {
        <app-stat-tiles [tiles]="stats()" />

        <section class="section">
          <h2 class="section-title">Managers under command</h2>
          <div class="grid-cards">
            @for (m of managers(); track m.guid) {
              <div class="card manager">
                <strong>{{ m.name }}</strong>
                <div class="muted email">{{ m.email }}</div>
                <div class="row figures">
                  <span><b>{{ m.trips }}</b> trips</span>
                  <span><b>{{ m.agents }}</b> agents</span>
                  <span [class.alert]="m.open > 0"><b>{{ m.open }}</b> open paradoxes</span>
                </div>
              </div>
            }
          </div>
        </section>

        <section class="section">
          <h2 class="section-title">All field agents</h2>
          <div class="card card--flush table-wrap">
            <table class="table">
              <thead><tr><th>Name</th><th>Type</th><th>Epoch</th><th>Manager</th><th class="num">Trips</th></tr></thead>
              <tbody>
                @for (a of agents(); track a.guid) {
                  <tr>
                    <td>{{ a.name }}</td>
                    <td><span class="badge badge--plain" [class]="a.licensed ? 'badge--brand' : 'badge--neutral'">{{ a.type }}</span></td>
                    <td class="muted">{{ a.epoch }}</td>
                    <td class="muted">{{ a.manager }}</td>
                    <td class="num">{{ a.trips }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </section>
      }
    </div>

    @if (createOpen()) {
      <app-create-manager-modal (created)="onManagerCreated()" (closed)="createOpen.set(false)" />
    }
  `,
  styles: `
    .manager { padding: 14px 16px; }
    .email { font-size: 12.5px; margin: 1px 0 12px; }
    .figures { gap: 14px; padding-top: 10px; border-top: 1px solid var(--border-subtle); font-size: 12.5px; color: var(--text-muted); }
    .figures b { color: var(--text); font-variant-numeric: tabular-nums; }
    .alert, .alert b { color: var(--red); }
  `,
})
export class DirectorDashboardComponent {
  protected readonly state = inject(AppStateService);
  protected readonly agency = inject(AgencyStore);
  private readonly feed = inject(ParadoxFeedStore);
  private readonly notifications = inject(NotificationService);

  protected readonly createOpen = signal(false);

  protected readonly stats = computed((): StatTile[] => {
    const trips = this.agency.trips();
    const paradoxes = this.feed.paradoxes();
    const open = paradoxes.filter(isOpenParadox).length;
    return [
      { label: 'Trips', value: trips.length },
      { label: 'Critical', value: trips.filter(t => t.tripType === 'CriticalTrip').length, tone: 'red' },
      { label: 'Paradoxes', value: paradoxes.length, tone: 'amber' },
      { label: 'Open', value: open, tone: open ? 'red' : 'green' },
      { label: 'Managers', value: this.agency.managers().length },
      { label: 'Agents', value: this.agency.agents().length },
      { label: 'Customers', value: this.agency.customers().length },
    ];
  });

  protected readonly managers = computed(() => {
    const trips = this.agency.trips();
    const agents = this.agency.agents();
    const paradoxes = this.feed.paradoxes();
    return this.agency.managers().map(m => ({
      guid: m.guid,
      name: fullName(m),
      email: m.email,
      trips: trips.filter(t => t.managerGuid === m.guid).length,
      agents: agents.filter(a => a.managerId === m.id).length,
      open: paradoxes.filter(p => p.managerGuid === m.guid && isOpenParadox(p)).length,
    }));
  });

  protected readonly agents = computed(() => {
    const managers = new Map(this.agency.managers().map(m => [m.id, fullName(m)]));
    const trips = this.agency.trips();
    return this.agency.agents().map(a => ({
      guid: a.guid,
      name: fullName(a),
      type: agentTypeLabel(a.agentType),
      licensed: a.agentType === 'LicensedAgent',
      epoch: a.specialisationEpochId?.name ?? '—',
      manager: a.managerId !== null ? managers.get(a.managerId) ?? '—' : '—',
      trips: trips.filter(t => t.licensedAgentId === a.id || t.agentId === a.id).length,
    }));
  });

  protected onManagerCreated(): void {
    this.createOpen.set(false);
    this.notifications.success('Manager appointed', 'The new manager is now under your command.');
    this.agency.refresh();
  }
}
