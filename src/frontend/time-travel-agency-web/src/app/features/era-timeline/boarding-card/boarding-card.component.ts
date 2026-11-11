import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TripService } from '../../../core/services/trip.service';
import { toErrorMessage } from '../../../core/http/error-message';
import { AppStateService } from '../../../state/app-state.service';
import { AgencyStore } from '../../../state/agency.store';
import { bookingInfo } from '../../../shared/utils/booking.utils';
import { formatDateTime, formatDuration } from '../../../shared/utils/date.utils';
import { tripDisplayName, tripStatusMeta } from '../../../shared/utils/status.utils';
import { formatYear, PHASE_COLORS, tripPhase, TripPin } from '../era-timeline.config';

interface FactCell {
  label: string;
  value: string;
  color?: string;
}

/** Boarding pass for the selected trip on the Continuum, including the booking action. */
@Component({
  selector: 'app-boarding-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  templateUrl: './boarding-card.component.html',
  styleUrl: './boarding-card.component.css',
  host: { '[style.--accent]': 'pin().zone.accent' },
})
export class BoardingCardComponent {
  readonly pin = input.required<TripPin>();
  readonly closed = output<void>();

  protected readonly state = inject(AppStateService);
  private readonly tripApi = inject(TripService);
  private readonly agency = inject(AgencyStore);

  protected readonly booking = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly justBooked = signal(false);

  protected readonly trip = computed(() => this.pin().trip);
  protected readonly name = computed(() => tripDisplayName(this.trip()));
  protected readonly bookingInfo = computed(() =>
    bookingInfo(this.trip(), this.state.currentCustomer()?.guid ?? null, this.agency.trips()),
  );
  protected readonly bookingStatus = computed(() => this.bookingInfo().kind);
  protected readonly conflictName = computed(() => {
    const other = this.bookingInfo().conflictWith;
    return other ? tripDisplayName(other) : '';
  });

  protected readonly rating = computed(() => {
    const reviews = this.trip().reviews;
    if (!reviews.length) return null;
    return `★ ${(reviews.reduce((sum, r) => sum + r.stars, 0) / reviews.length).toFixed(1)}`;
  });

  protected readonly facts = computed((): FactCell[] => {
    const t = this.trip();
    return [
      { label: 'Departure', value: formatDateTime(t.dateInRealLife) },
      { label: 'Duration', value: formatDuration(t.durationMinutes * 60_000) },
      { label: 'Status', value: tripStatusMeta(t.tripStatus).label, color: PHASE_COLORS[tripPhase(t)] },
      { label: 'Travellers', value: `${t.customers.length} aboard` },
    ];
  });

  protected readonly formatYear = formatYear;

  protected book(): void {
    const customer = this.state.currentCustomer();
    if (!customer) {
      this.state.requestRole('customer');
      return;
    }
    this.booking.set(true);
    this.error.set(null);
    this.tripApi.bookTrip(this.trip().guid, customer.guid).subscribe({
      next: () => {
        this.booking.set(false);
        this.justBooked.set(true);
        this.agency.refresh();
      },
      error: err => {
        this.booking.set(false);
        this.error.set(toErrorMessage(err, 'Booking failed. Please try again.'));
      },
    });
  }
}
