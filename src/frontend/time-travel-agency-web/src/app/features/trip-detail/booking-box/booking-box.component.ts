import { Component, Input, Output, EventEmitter, inject, computed, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TripDto } from '../../../core/models/trip.model';
import { AppStateService } from '../../../state/app-state.service';
import { TripService } from '../../../core/services/trip.service';
import { isDeparted, isBookingOpen } from '../../../shared/utils/date.utils';
import { tripStatusMeta } from '../../../shared/utils/status.utils';

type CtaState = 'booked' | 'departed' | 'unavailable' | 'boarding' | 'bookable';

@Component({
  selector: 'app-booking-box',
  standalone: true,
  styles: [`
    @keyframes confirm-flash {
      0%   { opacity: 0; transform: scale(0.88); }
      18%  { opacity: 1; transform: scale(1.04); }
      70%  { opacity: 1; transform: scale(1); }
      100% { opacity: 0; transform: scale(1.02); }
    }
    @keyframes check-pop {
      0%   { transform: scale(0); opacity: 0; }
      60%  { transform: scale(1.3); opacity: 1; }
      100% { transform: scale(1); opacity: 1; }
    }
    @keyframes ring-expand {
      0%   { transform: scale(0.6); opacity: 0.8; }
      100% { transform: scale(2.2); opacity: 0; }
    }
  `],
  template: `
    @if (state.isCustomer()) {
      <div style="background:#1E2A3A;border-radius:4px;padding:24px;position:relative;overflow:hidden;">

        <!-- Booking confirmation flash -->
        @if (justBooked()) {
          <div style="position:absolute;inset:0;z-index:10;display:flex;flex-direction:column;
                      align-items:center;justify-content:center;
                      background:rgba(10,24,18,0.94);
                      animation:confirm-flash 1.8s ease forwards;pointer-events:none;">
            <div style="position:relative;width:56px;height:56px;margin-bottom:14px;">
              <div style="position:absolute;inset:0;border-radius:50%;border:2px solid #3FAE79;
                          animation:ring-expand 0.7s ease forwards;"></div>
              <div style="position:absolute;inset:0;border-radius:50%;background:rgba(63,174,121,0.15);
                          display:flex;align-items:center;justify-content:center;">
                <span style="color:#3FAE79;font-size:26px;line-height:1;
                             animation:check-pop 0.4s cubic-bezier(.34,1.56,.64,1) 0.15s both;">✓</span>
              </div>
            </div>
            <div style="font-family:'Fraunces',serif;font-size:15px;color:#3FAE79;margin-bottom:4px;">
              Journey Booked
            </div>
            <div style="font-family:'IBM Plex Mono',monospace;font-size:9px;color:#2E6647;
                        letter-spacing:0.18em;">TEMPORAL SEAT CONFIRMED</div>
          </div>
        }

        @switch (ctaState()) {
          @case ('booked') {
            <button disabled style="width:100%;display:flex;align-items:center;justify-content:center;
                                   gap:8px;background:#1A2432;border:1px solid #2A3A50;color:#7A8496;
                                   font-weight:600;font-size:14px;padding:14px;border-radius:3px;cursor:not-allowed;">
              <span style="color:#3FAE79;font-size:15px;">✓</span>Already Booked
            </button>
          }
          @case ('boarding') {
            <button disabled style="width:100%;display:flex;align-items:center;justify-content:center;
                                   gap:8px;background:rgba(217,162,78,0.12);border:1px solid rgba(217,162,78,0.45);
                                   color:#D9A24E;font-weight:600;font-size:14px;padding:14px;
                                   border-radius:3px;cursor:not-allowed;">
              <span style="font-size:14px;">🕐</span>Boarding Closed
            </button>
            <div style="text-align:center;font-size:11.5px;color:#D9A24E;margin-top:10px;">
              Departing within the hour — bookings are locked.
            </div>
          }
          @case ('departed') {
            <button disabled style="width:100%;background:#1A2432;border:1px solid #2A3A50;color:#5A6478;
                                   font-weight:600;font-size:14px;padding:14px;border-radius:3px;cursor:not-allowed;">
              Trip Departed
            </button>
            <div style="text-align:center;font-size:11.5px;color:#5A6478;margin-top:10px;">
              This excursion has already left. Archived for reference.
            </div>
          }
          @case ('unavailable') {
            <button disabled style="width:100%;background:#1A2432;border:1px dashed #2E3E54;color:#6B7488;
                                   font-weight:600;font-size:14px;padding:14px;border-radius:3px;cursor:not-allowed;">
              Unavailable
            </button>
            <div style="text-align:center;font-size:11.5px;color:#6B7488;margin-top:10px;">
              This trip is {{ trip.tripStatus }} and cannot be booked.
            </div>
          }
          @case ('bookable') {
            <button (click)="book()" [disabled]="booking()"
                    style="width:100%;background:#C9A84C;border:none;color:#0B1120;font-weight:600;
                           font-size:14px;padding:14px;border-radius:3px;cursor:pointer;">
              {{ booking() ? 'Booking…' : 'Book This Trip' }}
            </button>
            <div style="text-align:center;font-size:11.5px;color:#6B7488;margin-top:10px;">
              Bookings close 1 hour before departure.
            </div>
          }
        }
        @if (errorMsg()) {
          <div style="color:#E05A4E;font-size:12px;margin-top:10px;text-align:center;">{{ errorMsg() }}</div>
        }
      </div>
    }

    @if (state.isAgent()) {
      <div style="background:#1E2A3A;border-radius:4px;padding:24px;">
        <div style="font-size:11px;color:#6B7488;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:12px;">
          Execution
        </div>
        <div style="font-size:12.5px;color:#8A93A6;margin-bottom:18px;">Licensed Agent view</div>
        <button (click)="goToReports()"
                style="width:100%;background:#C9A84C;border:none;color:#0B1120;font-weight:600;
                       font-size:14px;padding:14px;border-radius:3px;cursor:pointer;">
          File Field Report
        </button>
      </div>
    }

    @if (state.isManager()) {
      <div style="background:#1E2A3A;border-radius:4px;padding:24px;">
        <div style="font-size:11px;color:#6B7488;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:16px;">
          Manager Actions
        </div>
        <div style="margin-bottom:14px;">
          <div style="font-size:11.5px;color:#8A93A6;margin-bottom:6px;">Trip Type</div>
          <div style="background:#0B1120;border:1px solid #2E3E54;color:#F0EDE6;
                      padding:10px 12px;border-radius:3px;font-size:13px;">
            {{ trip.tripType }}
          </div>
        </div>
        <button (click)="assignAgent.emit(trip.guid)"
                style="width:100%;background:transparent;border:1px solid #C9A84C;color:#C9A84C;
                       font-weight:600;font-size:13.5px;padding:12px;border-radius:3px;cursor:pointer;">
          Reassign Licensed Agent
        </button>
      </div>
    }
  `,
})
export class BookingBoxComponent {
  @Input({ required: true }) trip!: TripDto;
  @Input() bookedTripGuids: string[] = [];
  @Output() assignAgent = new EventEmitter<string>();
  @Output() booked = new EventEmitter<string>();

  protected readonly state = inject(AppStateService);
  private readonly tripService = inject(TripService);
  private readonly router = inject(Router);

  readonly booking = signal(false);
  readonly errorMsg = signal('');
  readonly justBooked = signal(false);

  readonly ctaState = computed((): CtaState => {
    if (this.bookedTripGuids.includes(this.trip.guid)) return 'booked';
    if (isDeparted(this.trip.dateInRealLife)) return 'departed';
    if (this.trip.tripStatus !== 'Active') return 'unavailable';
    if (!isBookingOpen(this.trip.dateInRealLife)) return 'boarding';
    return 'bookable';
  });

  book(): void {
    const customer = this.state.currentCustomer();
    if (!customer) {
      this.errorMsg.set('Please select a customer identity first.');
      return;
    }
    this.booking.set(true);
    this.errorMsg.set('');
    this.tripService.bookTrip(this.trip.guid, customer.guid).subscribe({
      next: () => {
        this.booking.set(false);
        this.justBooked.set(true);
        setTimeout(() => this.justBooked.set(false), 1800);
        this.booked.emit(this.trip.guid);
      },
      error: (err) => {
        this.booking.set(false);
        this.errorMsg.set(err?.error ?? 'Booking failed. Please try again.');
      },
    });
  }

  goToReports(): void {
    this.router.navigate(['/reports'], { queryParams: { trip: this.trip.guid } });
  }
}
