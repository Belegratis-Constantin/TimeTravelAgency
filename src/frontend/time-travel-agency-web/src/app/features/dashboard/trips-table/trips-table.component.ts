import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TripDto } from '../../../core/models/trip.model';
import { AgencyStore } from '../../../state/agency.store';
import { ParadoxFeedStore } from '../../../state/paradox-feed.store';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { tripDisplayName } from '../../../shared/utils/status.utils';
import { IntegrityGaugeComponent } from '../../../shared/components/integrity-gauge/integrity-gauge.component';

@Component({
  selector: 'app-trips-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, RouterLink, StatusBadgeComponent, IntegrityGaugeComponent],
  template: `
    <div class="card card--flush table-wrap">
      <table class="table">
        <thead>
          <tr>
            <th>Trip</th><th>Departs</th><th>Status</th><th>Support agent</th><th class="num">Travellers</th>
            <th>Timeline stability</th><th><span class="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          @for (trip of trips(); track trip.guid) {
            <tr>
              <td>
                <div class="trip">
                  <a class="name" [routerLink]="['/trip', trip.guid]">{{ tripName(trip) }}</a>
                  @if (trip.tripType === 'CriticalTrip') { <app-status-badge [status]="trip.tripType" kind="tripType" /> }
                </div>
              </td>
              <td class="muted when">{{ trip.dateInRealLife | date: 'medium' }}</td>
              <td><app-status-badge [status]="trip.tripStatus" /></td>
              <td>{{ agency.agentName(trip.agentId) ?? '—' }}</td>
              <td class="num">{{ trip.customers.length }}</td>
              <td><app-integrity-gauge [open]="feed.openCountForTrip(trip.guid)" /></td>
              <td class="num">
                @if (!trip.agentId) {
                  <button type="button" class="btn btn--sm btn--accent" (click)="assign.emit(trip)">Assign agent</button>
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
    .trip { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .name { font-weight: 600; color: var(--text); }
    .name:hover { color: var(--brand); }
    .when { white-space: nowrap; }
  `,
})
export class TripsTableComponent {
  readonly trips = input.required<TripDto[]>();
  readonly assign = output<TripDto>();

  protected readonly agency = inject(AgencyStore);
  protected readonly feed = inject(ParadoxFeedStore);
  protected readonly tripName = tripDisplayName;
}
