import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AppStateService } from '../../state/app-state.service';
import { AgencyStore } from '../../state/agency.store';
import { ParadoxFeedStore } from '../../state/paradox-feed.store';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';
import { ParadoxListComponent } from '../../shared/components/paradox-list/paradox-list.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { AssignAgentModalComponent } from '../modals/assign-agent-modal/assign-agent-modal.component';
import { CRITICAL_PARADOX_THRESHOLD, epochLabel, isOpenParadox, tripDisplayName, tripTypeLabel } from '../../shared/utils/status.utils';
import { inQueueOrder } from '../../shared/utils/paradox-queue.utils';
import { TripReviewsComponent } from './trip-reviews/trip-reviews.component';
import { TripStaffComponent } from './trip-staff/trip-staff.component';
import { TripActionsComponent } from './trip-actions/trip-actions.component';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { IntegrityGaugeComponent } from '../../shared/components/integrity-gauge/integrity-gauge.component';

@Component({
  selector: 'app-trip-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    RouterLink,
    StatusBadgeComponent,
    ParadoxListComponent,
    EmptyStateComponent,
    AssignAgentModalComponent,
    TripReviewsComponent,
    TripStaffComponent,
    TripActionsComponent,
    IconComponent,
    IntegrityGaugeComponent,
  ],
  templateUrl: './trip-detail.component.html',
  styleUrl: './trip-detail.component.css',
})
export class TripDetailComponent {
  /** Route parameter, bound via withComponentInputBinding(). */
  readonly guid = input.required<string>();

  protected readonly state = inject(AppStateService);
  protected readonly agency = inject(AgencyStore);
  protected readonly feed = inject(ParadoxFeedStore);

  protected readonly assignOpen = signal(false);

  protected readonly trip = computed(() => this.agency.tripsByGuid().get(this.guid()) ?? null);
  protected readonly name = computed(() => {
    const t = this.trip();
    return t ? tripDisplayName(t) : '';
  });
  protected readonly typeLabel = computed(() => tripTypeLabel(this.trip()?.tripType ?? 'Trip'));
  protected readonly destinationEra = computed(() => {
    const t = this.trip();
    return t ? epochLabel(this.agency.agentsById().get(t.licensedAgentId)?.specialisationEpochId) : null;
  });

  /** In working order: the current paradox first, then the queue, then the solved ones. */
  protected readonly paradoxes = computed(() => inQueueOrder(this.feed.forTrip(this.guid())));
  protected readonly openParadoxes = computed(() => this.paradoxes().filter(isOpenParadox).length);

  /** Only the manager responsible for the trip may change paradox statuses (enforced by the backend too). */
  protected readonly canManage = computed(() => {
    const manager = this.state.currentManager();
    return this.state.isManager() && !!manager && this.trip()?.managerGuid === manager.guid;
  });

  /** Field reports and paradoxes are internal — hidden from customers. */
  protected readonly showReports = computed(() => !this.state.isCustomer());
  protected readonly showParadoxes = computed(() => !this.state.isCustomer());
  protected readonly criticalThreshold = CRITICAL_PARADOX_THRESHOLD;
  protected readonly agentName = (id: number) => this.agency.agentName(id);

  protected onAssigned(): void {
    this.assignOpen.set(false);
    this.agency.refresh();
  }
}
