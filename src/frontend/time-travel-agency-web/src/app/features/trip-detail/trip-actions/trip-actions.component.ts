import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TripDto } from '../../../core/models/trip.model';
import { TripService } from '../../../core/services/trip.service';
import { toErrorMessage } from '../../../core/http/error-message';
import { AppStateService } from '../../../state/app-state.service';
import { AgencyStore } from '../../../state/agency.store';
import { ParadoxFeedStore } from '../../../state/paradox-feed.store';
import { bookingState } from '../../../shared/utils/booking.utils';

const CONFIRMATION_MS = 1800;

/** The one action panel on a trip page — its content depends on the current role. */
@Component({
  selector: 'app-trip-actions',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  templateUrl: './trip-actions.component.html',
  styleUrl: './trip-actions.component.css',
})
export class TripActionsComponent {
  readonly trip = input.required<TripDto>();
  readonly canManage = input(false);
  readonly assignAgent = output<void>();

  protected readonly state = inject(AppStateService);
  private readonly tripApi = inject(TripService);
  private readonly agency = inject(AgencyStore);
  private readonly feed = inject(ParadoxFeedStore);

  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly justBooked = signal(false);

  protected readonly booking = computed(() => bookingState(this.trip(), this.state.currentCustomer()?.guid ?? null));

  protected readonly agentRole = computed(() => {
    const agent = this.state.currentAgent();
    if (!agent) return null;
    if (this.trip().licensedAgentId === agent.id) return 'Licensed agent';
    if (this.trip().agentId === agent.id) return 'Support agent';
    return null;
  });

  protected book(): void {
    const customer = this.state.currentCustomer();
    if (!customer) {
      this.state.requestRole('customer');
      return;
    }
    this.busy.set(true);
    this.error.set(null);
    this.tripApi.bookTrip(this.trip().guid, customer.guid).subscribe({
      next: () => {
        this.busy.set(false);
        this.justBooked.set(true);
        setTimeout(() => this.justBooked.set(false), CONFIRMATION_MS);
        this.agency.refresh();
      },
      error: err => {
        this.busy.set(false);
        this.error.set(toErrorMessage(err, 'Booking failed.'));
      },
    });
  }

  protected introduceParadox(): void {
    this.busy.set(true);
    this.error.set(null);
    this.feed.introduce(this.trip().guid).subscribe({
      next: () => this.busy.set(false),
      error: err => {
        this.busy.set(false);
        this.error.set(toErrorMessage(err, 'Could not introduce a paradox.'));
      },
    });
  }
}
