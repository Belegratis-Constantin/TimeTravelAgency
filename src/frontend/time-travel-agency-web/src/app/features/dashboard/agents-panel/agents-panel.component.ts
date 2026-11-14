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
        <div class="card agent">
          <div class="row row--between">
            <strong>{{ agent.name }}</strong>
            <span class="badge badge--plain" [class]="agent.licensed ? 'badge--brand' : 'badge--neutral'">{{ agent.type }}</span>
          </div>
          @if (agent.epoch) { <div class="epoch">{{ agent.epoch }}</div> }
          <div class="trips"><span class="trips-label">Assigned trips</span>{{ agent.trips }}</div>
        </div>
      } @empty {
        <p class="empty-hint">No agents in your team yet — recruit one.</p>
      }
    </div>
  `,
  styles: `
    .agent { padding: 14px 16px; }
    .epoch { font-size: 12.5px; color: var(--text-muted); margin-top: 2px; }
    .trips { margin-top: 12px; padding-top: 10px; border-top: 1px solid var(--border-subtle); font-size: 13px; color: var(--text-2); }
    .trips-label { display: block; font-size: 12px; color: var(--text-faint); margin-bottom: 1px; }
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
