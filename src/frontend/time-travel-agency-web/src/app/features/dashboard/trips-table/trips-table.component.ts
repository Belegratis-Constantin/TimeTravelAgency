import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { Router } from '@angular/router';
import { TripDto } from '../../../core/models/trip.model';
import { formatDateTime } from '../../../shared/utils/date.utils';
import { tripTypeLabel } from '../../../shared/utils/status.utils';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';

@Component({
  selector: 'app-trips-table',
  standalone: true,
  imports: [StatusBadgeComponent],
  template: `
    <div style="background:#1E2A3A;border-radius:4px;overflow:hidden;margin-bottom:48px;">
      <div style="display:grid;grid-template-columns:2fr 1.3fr 1fr 0.8fr 1.4fr;
                  padding:14px 22px;font-size:11px;color:#6B7488;letter-spacing:0.08em;
                  text-transform:uppercase;border-bottom:1px solid #2A3A50;">
        <span>Trip</span>
        <span>Departs</span>
        <span>Status</span>
        <span>Paradoxes</span>
        <span>Actions</span>
      </div>
      @for (trip of trips; track trip.guid) {
        <div class="dash-row"
             style="display:grid;grid-template-columns:2fr 1.3fr 1fr 0.8fr 1.4fr;
                    padding:16px 22px;align-items:center;border-bottom:1px solid #2A3A50;font-size:13.5px;">
          <div>
            <div style="font-weight:600;">{{ trip.tripName ?? 'Uncatalogued' }}</div>
            <div style="font-size:12px;color:#C9A84C;">{{ typeLabel(trip.tripType) }}</div>
          </div>
          <span style="color:#B7BFCC;">{{ departs(trip) }}</span>
          <app-status-badge [status]="trip.tripStatus" type="trip" />
          <span style="color:#B7BFCC;">{{ trip.paradoxes.length }}</span>
          <div style="display:flex;gap:8px;">
            <button (click)="viewTrip(trip.guid)"
                    class="nav-btn"
                    style="background:transparent;border:1px solid #2E3E54;color:#F0EDE6;
                           font-size:12px;padding:7px 12px;border-radius:3px;cursor:pointer;">
              View
            </button>
            <button (click)="assign.emit(trip.guid)"
                    class="nav-btn"
                    style="background:transparent;border:1px solid #2E3E54;color:#C9A84C;
                           font-size:12px;padding:7px 12px;border-radius:3px;cursor:pointer;">
              Assign
            </button>
          </div>
        </div>
      }
    </div>
  `,
})
export class TripsTableComponent {
  @Input() trips: TripDto[] = [];
  @Output() assign = new EventEmitter<string>();

  private readonly router = inject(Router);

  typeLabel(type: string): string { return tripTypeLabel(type); }

  departs(trip: TripDto): string {
    return formatDateTime(trip.dateInRealLife);
  }

  viewTrip(guid: string): void {
    this.router.navigate(['/trip', guid]);
  }
}
