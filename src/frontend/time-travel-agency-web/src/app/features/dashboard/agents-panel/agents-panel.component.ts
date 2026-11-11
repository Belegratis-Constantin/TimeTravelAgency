import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { AgentDto } from '../../../core/models/agent.model';
import { TripDto } from '../../../core/models/trip.model';
import { agentTypeLabel, epochLabel, fullName, tripDisplayName } from '../../../shared/utils/status.utils';

@Component({
  selector: 'app-agents-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="grid-cards">
      @for (agent of views(); track agent.guid) {
        <div class="card">
          <div class="row row--between">
            <strong>{{ agent.name }}</strong>
            <span class="badge" [class]="agent.licensed ? 'badge--gold' : 'badge--blue'">{{ agent.type }}</span>
          </div>
          @if (agent.epoch) { <div class="epoch">{{ agent.epoch }}</div> }
          <div class="panel-label trips-label">Assigned trips</div>
          <div class="trips">{{ agent.trips }}</div>
        </div>
      } @empty {
        <p class="empty-hint">No agents in your team yet — recruit one.</p>
      }
    </div>
  `,
  styles: `
    .epoch { font-size: 12px; color: var(--text-faint); margin-top: 6px; }
    .trips-label { margin: 14px 0 4px; }
    .trips { font-size: 13px; color: var(--text-2); }
  `,
})
export class AgentsPanelComponent {
  readonly agents = input.required<AgentDto[]>();
  readonly trips = input.required<TripDto[]>();

  protected readonly views = computed(() =>
    this.agents().map(agent => {
      const assigned = this.trips()
        .filter(t => t.licensedAgentId === agent.id || t.agentId === agent.id)
        .map(tripDisplayName);
      return {
        guid: agent.guid,
        name: fullName(agent),
        type: agentTypeLabel(agent.agentType),
        licensed: agent.agentType === 'LicensedAgent',
        epoch: epochLabel(agent.specialisationEpochId),
        trips: assigned.length ? assigned.join(', ') : 'None currently assigned',
      };
    }),
  );
}
