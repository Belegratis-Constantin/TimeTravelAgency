import { Component, OnInit, inject, signal } from '@angular/core';
import { TripService } from '../../core/services/trip.service';
import { AgentService } from '../../core/services/agent.service';
import { ManagerService } from '../../core/services/manager.service';
import { AppStateService } from '../../state/app-state.service';
import { TripDto } from '../../core/models/trip.model';
import { AgentDto } from '../../core/models/agent.model';
import { StatsPanelComponent } from './stats-panel/stats-panel.component';
import { TripsTableComponent } from './trips-table/trips-table.component';
import { AgentsPanelComponent } from './agents-panel/agents-panel.component';
import { CreateTripModalComponent } from '../modals/create-trip-modal/create-trip-modal.component';
import { AssignAgentModalComponent } from '../modals/assign-agent-modal/assign-agent-modal.component';
import { CreateAgentModalComponent } from '../modals/create-agent-modal/create-agent-modal.component';
import { PromoteAgentModalComponent } from '../modals/promote-agent-modal/promote-agent-modal.component';
import { forkJoin, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    StatsPanelComponent,
    TripsTableComponent,
    AgentsPanelComponent,
    CreateTripModalComponent,
    AssignAgentModalComponent,
    CreateAgentModalComponent,
    PromoteAgentModalComponent,
  ],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit {
  private readonly tripService = inject(TripService);
  private readonly agentService = inject(AgentService);
  private readonly managerService = inject(ManagerService);
  private readonly state = inject(AppStateService);

  readonly trips = signal<TripDto[]>([]);
  readonly agents = signal<AgentDto[]>([]);
  readonly loading = signal(true);
  readonly loadError = signal('');
  readonly showCreateAgent = signal(false);
  readonly showPromoteAgent = signal(false);
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
    const managerGuid = this.state.currentManager()?.guid;
    const agents$ = managerGuid
      ? this.managerService.getAgentsForManager(managerGuid)
      : this.agentService.getAll();

    const trips$ = managerGuid
      ? this.managerService.getTripsForManager(managerGuid)
      : this.tripService.getAll();

    forkJoin({
      trips: trips$,
      agents: agents$,
    }).subscribe({
      next: ({ trips, agents }) => {
        this.trips.set(trips);
        this.agents.set(agents);
        this.loading.set(false);
      },
      error: () => {
        this.loadError.set('Could not load dashboard — is the backend running?');
        this.loading.set(false);
      },
    });
  }

  onTripCreated(): void {
    this.createModalOpen.set(false);
    this.loadData();
  }

  onAgentCreated(): void {
    this.showCreateAgent.set(false);
    this.ngOnInit();
  }

  onAgentPromoted(): void {
    this.showPromoteAgent.set(false);
    this.ngOnInit();
  }

  onAgentAssigned(): void {
    this.assignTripGuid.set(null);
    this.loadData();
  }
}
