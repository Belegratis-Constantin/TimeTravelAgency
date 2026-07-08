import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { TripService } from '../../core/services/trip.service';
import { AgentService } from '../../core/services/agent.service';
import { AppStateService } from '../../state/app-state.service';
import { TripDto } from '../../core/models/trip.model';
import { AgentDto } from '../../core/models/agent.model';
import { agentFullName } from '../../shared/utils/status.utils';
import { TripCardComponent } from './trip-card/trip-card.component';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [TripCardComponent, RouterLink],
  templateUrl: './landing.component.html',
})
export class LandingComponent implements OnInit {
  private readonly tripService = inject(TripService);
  private readonly agentService = inject(AgentService);
  private readonly router = inject(Router);
  protected readonly state = inject(AppStateService);

  private readonly allTrips = signal<TripDto[]>([]);
  private readonly agents = signal<AgentDto[]>([]);

  readonly filterEra = signal('all');
  readonly filterType = signal('all');
  readonly sortOrder = signal<'soonest' | 'latest'>('soonest');
  readonly loading = signal(true);

  readonly agentMap = computed((): Map<number, string> => {
    const map = new Map<number, string>();
    this.agents().forEach(agent => map.set(agent.id, agentFullName(agent)));
    return map;
  });

  readonly eraOptions = computed(() => {
    return [...new Set(this.allTrips().map(t => t.tripName ?? 'Uncatalogued'))];
  });

  readonly filteredTrips = computed((): TripDto[] => {
    let trips = this.allTrips();

    if (this.filterEra() !== 'all') {
      trips = trips.filter(t => (t.tripName ?? 'Uncatalogued') === this.filterEra());
    }
    if (this.filterType() !== 'all') {
      trips = trips.filter(t => t.tripType === this.filterType());
    }

    if (this.state.isAgent()) {
      const agent = this.state.currentAgent();
      if (agent) {
        trips = trips.filter(t => t.licensedAgentId === agent.id || t.agentId === agent.id);
      }
    }

    return [...trips].sort((a, b) => {
      const tA = new Date(a.dateInRealLife).getTime();
      const tB = new Date(b.dateInRealLife).getTime();
      return this.sortOrder() === 'soonest' ? tA - tB : tB - tA;
    });
  });

  readonly landingTitle = computed(() => {
    if (this.state.isAgent()) return 'Your Assigned Trips';
    if (this.state.isManager()) return 'All Trips — Overview';
    return 'Upcoming Departures';
  });

  ngOnInit(): void {
    forkJoin({
      trips: this.tripService.getAll(),
      agents: this.agentService.getAll(),
    }).subscribe(({ trips, agents }) => {
      this.allTrips.set(trips);
      this.agents.set(agents);
      this.loading.set(false);
    });
  }

  agentNameForTrip(trip: TripDto): string {
    return this.agentMap().get(trip.licensedAgentId) ?? `Agent #${trip.licensedAgentId}`;
  }

  navigateToTrip(guid: string): void {
    this.router.navigate(['/trip', guid]);
  }
}
