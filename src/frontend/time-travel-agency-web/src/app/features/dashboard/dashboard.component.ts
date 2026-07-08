import { Component, OnInit, inject, signal } from '@angular/core';
import { TripService } from '../../core/services/trip.service';
import { AgentService } from '../../core/services/agent.service';
import { TripDto } from '../../core/models/trip.model';
import { AgentDto } from '../../core/models/agent.model';
import { StatsPanelComponent } from './stats-panel/stats-panel.component';
import { TripsTableComponent } from './trips-table/trips-table.component';
import { AgentsPanelComponent } from './agents-panel/agents-panel.component';
import { CreateTripModalComponent } from '../modals/create-trip-modal/create-trip-modal.component';
import { AssignAgentModalComponent } from '../modals/assign-agent-modal/assign-agent-modal.component';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    StatsPanelComponent,
    TripsTableComponent,
    AgentsPanelComponent,
    CreateTripModalComponent,
    AssignAgentModalComponent,
  ],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit {
  private readonly tripService = inject(TripService);
  private readonly agentService = inject(AgentService);

  readonly trips = signal<TripDto[]>([]);
  readonly agents = signal<AgentDto[]>([]);
  readonly loading = signal(true);
  readonly createModalOpen = signal(false);
  readonly assignTripGuid = signal<string | null>(null);

  get assignTripName(): string {
    const guid = this.assignTripGuid();
    return this.trips().find(t => t.guid === guid)?.tripName ?? '';
  }

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    forkJoin({
      trips: this.tripService.getAll(),
      agents: this.agentService.getAll(),
    }).subscribe(({ trips, agents }) => {
      this.trips.set(trips);
      this.agents.set(agents);
      this.loading.set(false);
    });
  }

  onTripCreated(): void {
    this.createModalOpen.set(false);
    this.loadData();
  }

  onAgentAssigned(): void {
    this.assignTripGuid.set(null);
    this.loadData();
  }
}
