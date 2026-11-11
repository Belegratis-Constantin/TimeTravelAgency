import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TripService } from '../../../core/services/trip.service';
import { toErrorMessage } from '../../../core/http/error-message';
import { AppStateService } from '../../../state/app-state.service';
import { AgencyStore } from '../../../state/agency.store';
import { ParadoxFeedStore } from '../../../state/paradox-feed.store';
import { bookingState } from '../../../shared/utils/booking.utils';
import { formatDateOnly } from '../../../shared/utils/date.utils';
import { tripDisplayName } from '../../../shared/utils/status.utils';
import { formatYear, RISK_COLORS, RISK_LABELS, riskLevel, TripPin } from '../era-timeline.config';

interface FactCell {
  label: string;
  value: string;
  color?: string;
}

const STATUS_COLORS: Record<string, string> = { Active: '#5B8DC9', Completed: '#8A93A6', Cancelled: '#B5574A' };

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
  private readonly feed = inject(ParadoxFeedStore);

  protected readonly booking = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly justBooked = signal(false);

  protected readonly trip = computed(() => this.pin().trip);
  protected readonly name = computed(() => tripDisplayName(this.trip()));
  protected readonly openParadoxes = computed(() => this.feed.openCountForTrip(this.trip().guid));
  protected readonly risk = computed(() => riskLevel(this.openParadoxes()));
  protected readonly riskColor = computed(() => RISK_COLORS[this.risk()]);
  protected readonly bookingStatus = computed(() => bookingState(this.trip(), this.state.currentCustomer()?.guid ?? null));

  protected readonly rating = computed(() => {
    const reviews = this.trip().reviews;
    if (!reviews.length) return null;
    return `★ ${(reviews.reduce((sum, r) => sum + r.stars, 0) / reviews.length).toFixed(1)}`;
  });

  protected readonly facts = computed((): FactCell[] => {
    const t = this.trip();
    return [
      { label: 'Departure', value: formatDateOnly(t.dateInRealLife) },
      { label: 'Status', value: t.tripStatus, color: STATUS_COLORS[t.tripStatus] },
      { label: 'Travellers', value: `${t.customers.length} aboard` },
      { label: 'Paradox Risk', value: RISK_LABELS[this.risk()], color: this.riskColor() },
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
