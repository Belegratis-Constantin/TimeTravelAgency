import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { TripService } from '../../core/services/trip.service';
import { AgentService } from '../../core/services/agent.service';
import { TripDto } from '../../core/models/trip.model';
import { AgentDto } from '../../core/models/agent.model';
import { tripStatusMeta, agentFullName, tripTypeLabel } from '../../shared/utils/status.utils';
import { DatePipe } from '@angular/common';
import { TripTimelineComponent } from './trip-timeline/trip-timeline.component';
import { TripReviewsComponent } from './trip-reviews/trip-reviews.component';
import { TripParadoxesComponent } from './trip-paradoxes/trip-paradoxes.component';
import { TripStaffComponent } from './trip-staff/trip-staff.component';
import { BookingBoxComponent } from './booking-box/booking-box.component';
import { AssignAgentModalComponent } from '../modals/assign-agent-modal/assign-agent-modal.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';

@Component({
  selector: 'app-trip-detail',
  standalone: true,
  imports: [
    DatePipe,
    TripTimelineComponent,
    TripReviewsComponent,
    TripParadoxesComponent,
    TripStaffComponent,
    BookingBoxComponent,
    AssignAgentModalComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './trip-detail.component.html',
})
export class TripDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly tripService = inject(TripService);
  private readonly agentService = inject(AgentService);

  readonly trip = signal<TripDto | null>(null);
  readonly agents = signal<AgentDto[]>([]);
  readonly loading = signal(true);
  readonly loadError = signal('');
  readonly bookedTripGuids = signal<string[]>([]);
  readonly assignModalOpen = signal(false);

  ngOnInit(): void {
    const guid = this.route.snapshot.paramMap.get('guid') ?? '';
    forkJoin({
      trip: this.tripService.getById(guid),
      agents: this.agentService.getAll(),
    }).subscribe({
      next: ({ trip, agents }) => {
        this.trip.set(trip);
        this.agents.set(agents);
        this.loading.set(false);
      },
      error: () => {
        this.loadError.set('Could not load trip — is the backend running?');
        this.loading.set(false);
      },
    });
  }

  get statusMeta() {
    const t = this.trip();
    return t ? tripStatusMeta(t.tripStatus) : { label: '', color: '', bg: '' };
  }

  readonly tripTypeLabel = tripTypeLabel;

  get licensedAgentName(): string {
    const t = this.trip();
    if (!t) return '';
    const agent = this.agents().find(a => a.id === t.licensedAgentId);
    return agent ? agentFullName(agent) : `Agent #${t.licensedAgentId}`;
  }

  get supportAgentName(): string | null {
    const t = this.trip();
    if (!t || !t.agentId) return null;
    const agent = this.agents().find(a => a.id === t.agentId);
    return agent ? agentFullName(agent) : null;
  }

  get displayName(): string {
    return this.trip()?.tripName ?? 'Uncatalogued Destination';
  }

  goBack(): void {
    this.router.navigate(['/']);
  }

  onBooked(guid: string): void {
    this.bookedTripGuids.update(list => [...list, guid]);
  }

  onAssignRequested(): void {
    this.assignModalOpen.set(true);
  }

  onAssigned(): void {
    this.assignModalOpen.set(false);
    this.refreshTrip();
  }

  onParadoxChanged(): void {
    this.refreshTrip();
  }

  private refreshTrip(): void {
    const guid = this.route.snapshot.paramMap.get('guid') ?? '';
    this.tripService.getById(guid).subscribe({
      next: trip => this.trip.set(trip),
      error: () => {},
    });
  }
}
