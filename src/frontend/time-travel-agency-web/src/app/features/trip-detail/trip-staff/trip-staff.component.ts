import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { TripDto } from '../../../core/models/trip.model';
import { AgencyStore } from '../../../state/agency.store';
import { fullName, initials } from '../../../shared/utils/status.utils';

@Component({
  selector: 'app-trip-staff',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="card">
      <div class="panel-label">Crew</div>
      <div class="stack">
        <div class="kv"><span>Licensed agent</span><span>{{ agency.agentName(trip().licensedAgentId) }}</span></div>
        <div class="kv"><span>Support agent</span><span>{{ agency.agentName(trip().agentId) ?? '—' }}</span></div>
        <div class="kv"><span>Manager</span><span>{{ managerName() }}</span></div>
      </div>
    </div>

    <div class="card">
      <div class="panel-label">Travellers · {{ trip().customers.length }}</div>
      @if (showTravellerNames()) {
        <ul class="travellers">
          @for (c of trip().customers; track c.guid) {
            <li><span class="avatar">{{ initials(c) }}</span>{{ c.firstname }} {{ c.lastname }}</li>
          } @empty {
            <li class="empty-hint">No travellers booked yet.</li>
          }
        </ul>
      } @else {
        <p class="muted count">Traveller identities are confidential.</p>
      }
    </div>
  `,
  styles: `
    :host { display: grid; gap: 24px; }
    .travellers { list-style: none; margin: 0; padding: 0; display: grid; gap: 12px; }
    .travellers li { display: flex; align-items: center; gap: 12px; font-size: 13.5px; }
    .count { margin: 0; font-size: 13px; }
  `,
})
export class TripStaffComponent {
  readonly trip = input.required<TripDto>();
  readonly showTravellerNames = input(true);

  protected readonly agency = inject(AgencyStore);
  protected readonly initials = initials;

  protected readonly managerName = computed(() => {
    const manager = this.agency.managers().find(m => m.guid === this.trip().managerGuid);
    return manager ? fullName(manager) : '—';
  });
}
