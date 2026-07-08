import { Component, Input } from '@angular/core';
import { AgentDto } from '../../../core/models/agent.model';
import { TripDto } from '../../../core/models/trip.model';
import { agentFullName } from '../../../shared/utils/status.utils';

interface AgentView {
  name: string;
  roleLabel: string;
  tripsLabel: string;
}

@Component({
  selector: 'app-agents-panel',
  standalone: true,
  template: `
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:18px;">
      @for (agent of agentViews; track agent.name) {
        <div style="background:#1E2A3A;border-radius:4px;padding:20px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
            <span style="font-weight:600;font-size:14.5px;">{{ agent.name }}</span>
            <span style="font-size:10.5px;color:#8A93A6;background:#0B1120;border:1px solid #2A3A50;
                         padding:3px 8px;border-radius:20px;">{{ agent.roleLabel }}</span>
          </div>
          <div style="font-size:12px;color:#6B7488;letter-spacing:0.06em;text-transform:uppercase;margin-bottom:6px;">
            Assigned Trips
          </div>
          <div style="font-size:13px;color:#B7BFCC;line-height:1.6;">{{ agent.tripsLabel }}</div>
        </div>
      }
    </div>
  `,
})
export class AgentsPanelComponent {
  @Input() agents: AgentDto[] = [];
  @Input() trips: TripDto[] = [];

  get agentViews(): AgentView[] {
    return this.agents.map(agent => {
      const assignedNames = this.trips
        .filter(t => t.licensedAgentId === agent.id)
        .map(t => t.tripName ?? 'Uncatalogued');

      return {
        name: agentFullName(agent),
        roleLabel: agent.agentType ?? 'Agent',
        tripsLabel: assignedNames.length > 0 ? assignedNames.join(', ') : 'None currently assigned',
      };
    });
  }
}
