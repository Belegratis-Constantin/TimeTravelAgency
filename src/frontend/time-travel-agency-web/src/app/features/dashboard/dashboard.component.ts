import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { TripDto } from '../../core/models/trip.model';
import { AppStateService } from '../../state/app-state.service';
import { AgencyStore } from '../../state/agency.store';
import { ParadoxFeedStore } from '../../state/paradox-feed.store';
import { NotificationService } from '../../state/notification.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { StatTile, StatTilesComponent } from '../../shared/components/stat-tile/stat-tile.component';
import { isOpenParadox } from '../../shared/utils/status.utils';
import { TripsTableComponent } from './trips-table/trips-table.component';
import { AgentsPanelComponent } from './agents-panel/agents-panel.component';
import { CreateTripModalComponent } from '../modals/create-trip-modal/create-trip-modal.component';
import { AssignAgentModalComponent } from '../modals/assign-agent-modal/assign-agent-modal.component';
import { CreateAgentModalComponent } from '../modals/create-agent-modal/create-agent-modal.component';
import { PromoteAgentModalComponent } from '../modals/promote-agent-modal/promote-agent-modal.component';
import { IconComponent } from '../../shared/components/icon/icon.component';

type DashboardModal = 'createTrip' | 'createAgent' | 'promoteAgent' | null;

@Component({
  selector: 'app-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PageHeaderComponent,
    StatTilesComponent,
    TripsTableComponent,
    AgentsPanelComponent,
    CreateTripModalComponent,
    AssignAgentModalComponent,
    CreateAgentModalComponent,
    PromoteAgentModalComponent,
    IconComponent,
  ],
  template: `
    <div class="page">
      <app-page-header eyebrow="Manager dashboard" [title]="state.displayName()"
                       subtitle="Your trips, your team and the paradoxes threatening them.">
        <button type="button" class="btn" (click)="modal.set('createAgent')"><app-icon name="plus" /> Recruit agent</button>
        <button type="button" class="btn" (click)="modal.set('promoteAgent')"><app-icon name="award" /> Grant licence</button>
        <button type="button" class="btn btn--primary" (click)="modal.set('createTrip')"><app-icon name="plus" /> Create trip</button>
      </app-page-header>

      @if (agency.initialLoading()) {
        <p class="state-msg">Loading dashboard…</p>
      } @else {
        <app-stat-tiles [tiles]="stats()" />

        <section class="section">
          <h2 class="section-title">Your trips</h2>
          <app-trips-table [trips]="agency.scopedTrips()" (assign)="assignTrip.set($event)" />
        </section>

        <section class="section">
          <h2 class="section-title">Your team</h2>
          <app-agents-panel [agents]="team()" [trips]="agency.trips()" />
        </section>
      }
    </div>

    @switch (modal()) {
      @case ('createTrip') {
        <app-create-trip-modal (created)="done('Trip created')" (closed)="modal.set(null)" />
      }
      @case ('createAgent') {
        <app-create-agent-modal (created)="done('Agent recruited')" (closed)="modal.set(null)" />
      }
      @case ('promoteAgent') {
        <app-promote-agent-modal (promoted)="done('Licence granted')" (closed)="modal.set(null)" />
      }
    }
    @if (assignTrip(); as trip) {
      <app-assign-agent-modal [trip]="trip" (assigned)="done('Support agent assigned')" (closed)="assignTrip.set(null)" />
    }
  `,
})
export class DashboardComponent {
  protected readonly state = inject(AppStateService);
  protected readonly agency = inject(AgencyStore);
  private readonly feed = inject(ParadoxFeedStore);
  private readonly notifications = inject(NotificationService);

  protected readonly modal = signal<DashboardModal>(null);
  protected readonly assignTrip = signal<TripDto | null>(null);

  protected readonly team = computed(() => {
    const managerId = this.state.currentManager()?.id;
    return this.agency.agents().filter(a => a.managerId === managerId);
  });

  protected readonly stats = computed((): StatTile[] => {
    const trips = this.agency.scopedTrips();
    const open = this.feed.scoped().filter(isOpenParadox).length;
    return [
      { label: 'Trips', value: trips.length },
      { label: 'Scheduled', value: trips.filter(t => t.tripStatus === 'Scheduled').length, tone: 'blue' },
      { label: 'Under way', value: trips.filter(t => t.tripStatus === 'Active').length, tone: 'live' },
      { label: 'Critical', value: trips.filter(t => t.tripType === 'CriticalTrip').length, tone: 'red' },
      { label: 'Travellers', value: trips.reduce((sum, t) => sum + t.customers.length, 0) },
      { label: 'Open paradoxes', value: open, tone: open ? 'amber' : 'green' },
      { label: 'Agents', value: this.team().length },
    ];
  });

  protected done(message: string): void {
    this.modal.set(null);
    this.assignTrip.set(null);
    this.notifications.success(message);
    this.agency.refresh();
  }
}
