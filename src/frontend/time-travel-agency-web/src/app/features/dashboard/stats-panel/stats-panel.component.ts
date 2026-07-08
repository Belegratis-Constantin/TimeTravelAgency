import { Component, Input, computed, signal } from '@angular/core';
import { TripDto } from '../../../core/models/trip.model';

@Component({
  selector: 'app-stats-panel',
  standalone: true,
  template: `
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:20px;margin-bottom:44px;">
      <div style="background:#1E2A3A;border-radius:4px;padding:24px;">
        <div style="font-family:'Fraunces',serif;font-size:34px;">{{ totalTrips }}</div>
        <div style="font-size:12px;color:#8A93A6;letter-spacing:0.06em;text-transform:uppercase;margin-top:6px;">
          Total Trips
        </div>
      </div>
      <div style="background:#1E2A3A;border-radius:4px;padding:24px;">
        <div style="font-family:'Fraunces',serif;font-size:34px;color:#5B8DC9;">{{ activeTrips }}</div>
        <div style="font-size:12px;color:#8A93A6;letter-spacing:0.06em;text-transform:uppercase;margin-top:6px;">
          Active Trips
        </div>
      </div>
      <div style="background:#1E2A3A;border-radius:4px;padding:24px;">
        <div style="font-family:'Fraunces',serif;font-size:34px;">{{ totalCustomers }}</div>
        <div style="font-size:12px;color:#8A93A6;letter-spacing:0.06em;text-transform:uppercase;margin-top:6px;">
          Total Customers
        </div>
      </div>
      <div style="background:#1E2A3A;border-radius:4px;padding:24px;">
        <div style="font-family:'Fraunces',serif;font-size:34px;color:#D9A24E;">{{ openParadoxes }}</div>
        <div style="font-size:12px;color:#8A93A6;letter-spacing:0.06em;text-transform:uppercase;margin-top:6px;">
          Open Paradoxes
        </div>
      </div>
    </div>
  `,
})
export class StatsPanelComponent {
  @Input() trips: TripDto[] = [];

  get totalTrips(): number { return this.trips.length; }

  get activeTrips(): number {
    return this.trips.filter(t => t.tripStatus === 'Active' || t.tripStatus === 'Critical').length;
  }

  get totalCustomers(): number {
    return this.trips.reduce((sum, t) => sum + t.customers.length, 0);
  }

  get openParadoxes(): number {
    return this.trips.reduce((sum, t) =>
      sum + t.paradoxes.filter(p => p.paradoxStatus !== 'Resolved').length, 0);
  }
}
