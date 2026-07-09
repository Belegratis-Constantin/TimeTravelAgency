import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CustomerService } from '../../core/services/customer.service';
import { AppStateService } from '../../state/app-state.service';
import { TripDto } from '../../core/models/trip.model';
import { tripStatusMeta, tripTypeLabel } from '../../shared/utils/status.utils';
import { formatDateOnly } from '../../shared/utils/date.utils';

@Component({
  selector: 'app-customer-profile',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div style="max-width:1000px;margin:0 auto;padding:56px;">

      <!-- Customer identity -->
      @if (state.currentCustomer(); as c) {
        <div style="display:flex;align-items:center;gap:24px;margin-bottom:48px;">
          <div style="width:64px;height:64px;border-radius:50%;background:#1E2A3A;border:2px solid #C9A84C;
                      display:flex;align-items:center;justify-content:center;
                      font-family:'Fraunces',serif;font-size:22px;color:#C9A84C;">
            {{ c.firstname[0] }}{{ c.lastname[0] }}
          </div>
          <div>
            <div style="font-family:'Fraunces',serif;font-size:30px;">{{ c.firstname }} {{ c.lastname }}</div>
            <div style="font-size:13px;color:#8A93A6;margin-top:4px;">{{ c.email }}</div>
          </div>
        </div>
      }

      @if (loading()) {
        <div style="color:#6B7488;font-size:14px;padding:60px 0;text-align:center;">
          Loading your journeys…
        </div>
      }

      @if (!loading()) {
        @if (trips().length === 0) {
          <div style="text-align:center;padding:80px 0;">
            <div style="font-family:'Fraunces',serif;font-size:22px;margin-bottom:12px;color:#6B7488;">
              No journeys booked yet
            </div>
            <div style="color:#6B7488;font-size:14px;margin-bottom:28px;">
              The timeline awaits. Browse our destinations and secure your passage.
            </div>
            <a routerLink="/"
               style="background:#C9A84C;border:none;color:#0B1120;font-weight:600;
                      font-size:14px;padding:14px 30px;cursor:pointer;border-radius:2px;text-decoration:none;">
              Browse Destinations
            </a>
          </div>
        } @else {
          <div style="font-family:'Fraunces',serif;font-size:22px;margin-bottom:24px;">
            Your Booked Journeys
          </div>
          <div style="display:flex;flex-direction:column;gap:20px;">
            @for (trip of trips(); track trip.guid) {
              <a [routerLink]="['/trip', trip.guid]"
                 style="background:#1E2A3A;border-radius:4px;padding:24px 28px;
                        border:1px solid #2E3E54;text-decoration:none;color:inherit;display:block;">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;">
                  <div>
                    <div style="font-family:'Fraunces',serif;font-size:18px;margin-bottom:4px;">
                      {{ trip.tripName ?? 'Unnamed Expedition' }}
                    </div>
                    <div style="font-size:12px;color:#8A93A6;">
                      {{ formatDate(trip.dateInRealLife) }}
                      · {{ typeLabel(trip.tripType) }}
                    </div>
                  </div>
                  <div>
                    <span [style.background]="statusMeta(trip.tripStatus).bg"
                          [style.color]="statusMeta(trip.tripStatus).color"
                          style="font-size:11px;font-weight:600;padding:4px 12px;border-radius:20px;">
                      {{ statusMeta(trip.tripStatus).label }}
                    </span>
                  </div>
                </div>

                <!-- Paradox summary -->
                @if (trip.paradoxes.length > 0) {
                  <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;padding-top:12px;border-top:1px solid #2E3E54;">
                    <span style="font-size:11px;color:#D9A24E;">
                      {{ trip.paradoxes.length }} paradox{{ trip.paradoxes.length !== 1 ? 'es' : '' }} on record
                    </span>
                    @if (openParadoxes(trip) > 0) {
                      <span style="font-size:11px;color:#E05A4E;">
                        · {{ openParadoxes(trip) }} unresolved
                      </span>
                    }
                  </div>
                }
              </a>
            }
          </div>
        }
      }
    </div>
  `,
})
export class CustomerProfileComponent implements OnInit {
  private readonly customerService = inject(CustomerService);
  protected readonly state = inject(AppStateService);

  readonly trips = signal<TripDto[]>([]);
  readonly loading = signal(true);

  ngOnInit(): void {
    const guid = this.state.currentCustomer()?.guid;
    if (!guid) { this.loading.set(false); return; }

    this.customerService.getTrips(guid).subscribe({
      next: trips => { this.trips.set(trips); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  statusMeta(status: string) { return tripStatusMeta(status); }
  typeLabel(type: string) { return tripTypeLabel(type); }
  formatDate(iso: string) { return formatDateOnly(iso); }

  openParadoxes(trip: TripDto): number {
    return trip.paradoxes.filter(p => p.paradoxStatus !== 'Solved').length;
  }
}
