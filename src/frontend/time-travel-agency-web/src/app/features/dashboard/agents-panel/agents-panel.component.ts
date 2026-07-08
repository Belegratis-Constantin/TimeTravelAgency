import { Component, Input } from '@angular/core';
import { AgentDto } from '../../../core/models/agent.model';
import { TripDto } from '../../../core/models/trip.model';
import { agentFullName } from '../../../shared/utils/status.utils';

interface AgentView {
  name: string;
  roleLabel: string;
  epochLabel: string | null;
  tripsLabel: string;
}

@Component({
  selector: 'app-agents-panel',
  standalone: true,
  template: `
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:18px;">
      @for (agent of agentViews; track agent.name) {
        <div style="background:#1E2A3A;border-radius:4px;padding:20px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
            <span style="font-weight:600;font-size:14.5px;">{{ agent.name }}</span>
            <span style="font-size:10.5px;color:#C9A84C;background:rgba(201,168,76,0.1);
                         border:1px solid rgba(201,168,76,0.25);padding:3px 8px;border-radius:20px;">
              {{ agent.roleLabel }}
            </span>
          </div>
          @if (agent.epochLabel) {
            <div style="font-size:11.5px;color:#6B7488;margin-bottom:10px;">{{ agent.epochLabel }}</div>
          }
          <div style="font-size:11px;color:#6B7488;letter-spacing:0.06em;text-transform:uppercase;margin-bottom:5px;">
            Assigned Trips
          </div>
          <div style="font-size:13px;color:#B7BFCC;line-height:1.6;">{{ agent.tripsLabel }}</div>
        </div>
      }
      @if (agentViews.length === 0) {
        <div style="color:#6B7488;font-size:13.5px;font-style:italic;padding:8px 0;">
          No agents assigned to this manager yet.
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
      const assignedTrips = this.trips.filter(
        t => t.licensedAgentId === agent.id || t.agentId === agent.id
      );
      const assignedNames = assignedTrips.map(t => t.tripName ?? 'Uncatalogued');

      const epoch = agent.specialisationEpochId;
      const epochLabel = epoch
        ? `${epoch.name} (${epoch.startYear > 0 ? epoch.startYear + ' CE' : (-epoch.startYear) + ' BCE'} – ${epoch.endYear > 0 ? epoch.endYear + ' CE' : (-epoch.endYear) + ' BCE'})`
        : null;

      return {
        name: agentFullName(agent),
        roleLabel: agent.agentType === 'LicensedAgent' ? 'Licensed Agent' : 'Support Agent',
        epochLabel,
        tripsLabel: assignedNames.length > 0 ? assignedNames.join(', ') : 'None currently assigned',
      };
    });
  }
}
