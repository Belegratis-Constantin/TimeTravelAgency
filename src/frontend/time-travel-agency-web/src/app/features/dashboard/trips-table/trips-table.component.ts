import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TripDto } from '../../../core/models/trip.model';
import { AgencyStore } from '../../../state/agency.store';
import { ParadoxFeedStore } from '../../../state/paradox-feed.store';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { tripDisplayName } from '../../../shared/utils/status.utils';

@Component({
  selector: 'app-trips-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, RouterLink, StatusBadgeComponent],
  template: `
    <div class="card card--flush table-wrap">
      <table class="table">
        <thead>
          <tr>
            <th>Trip</th><th>Departs</th><th>Status</th><th>Support agent</th><th class="num">Travellers</th>
            <th class="num">Open paradoxes</th><th><span class="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          @for (trip of trips(); track trip.guid) {
            <tr>
              <td>
                <a class="name" [routerLink]="['/trip', trip.guid]">{{ tripName(trip) }}</a>
                <div><app-status-badge [status]="trip.tripType" kind="tripType" /></div>
              </td>
              <td class="muted">{{ trip.dateInRealLife | date: 'medium' }}</td>
              <td><app-status-badge [status]="trip.tripStatus" /></td>
              <td>{{ agency.agentName(trip.agentId) ?? '—' }}</td>
              <td class="num">{{ trip.customers.length }}</td>
              <td class="num" [class.alert]="feed.openCountForTrip(trip.guid) > 0">{{ feed.openCountForTrip(trip.guid) }}</td>
              <td class="num">
                @if (!trip.agentId) {
                  <button type="button" class="btn btn--sm btn--outline-gold" (click)="assign.emit(trip)">Assign agent</button>
                }
              </td>
            </tr>
          } @empty {
            <tr><td colspan="7" class="empty-hint">You do not manage any trips yet.</td></tr>
          }
        </tbody>
      </table>
    </div>
  `,
  styles: `
    .name { font-weight: 600; color: var(--text); display: inline-block; margin-bottom: 4px; }
    .name:hover { color: var(--gold); }
    .alert { color: var(--red); font-weight: 600; }
  `,
})
export class TripsTableComponent {
  readonly trips = input.required<TripDto[]>();
  readonly assign = output<TripDto>();

  protected readonly agency = inject(AgencyStore);
  protected readonly feed = inject(ParadoxFeedStore);
  protected readonly tripName = tripDisplayName;
}
