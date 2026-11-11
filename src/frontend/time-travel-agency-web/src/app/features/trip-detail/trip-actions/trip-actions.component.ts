import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TripDto } from '../../../core/models/trip.model';
import { ParadoxFeedDto } from '../../../core/models/paradox.model';
import { TripService } from '../../../core/services/trip.service';
import { toErrorMessage } from '../../../core/http/error-message';
import { AppStateService } from '../../../state/app-state.service';
import { AgencyStore } from '../../../state/agency.store';
import { ParadoxFeedStore } from '../../../state/paradox-feed.store';
import { NotificationService } from '../../../state/notification.service';
import { bookingInfo } from '../../../shared/utils/booking.utils';
import { formatDateTime } from '../../../shared/utils/date.utils';
import { isOpenParadox, paradoxTypeLabel, tripDisplayName } from '../../../shared/utils/status.utils';
import { inQueueOrder, queueLabel } from '../../../shared/utils/paradox-queue.utils';
import { ParadoxStabilizerComponent } from '../../paradox-stabilizer/paradox-stabilizer.component';
import { BLOCK_TEXT, stabiliseBlock } from '../../../shared/utils/dual-lock.utils';

const CONFIRMATION_MS = 1800;

/** The one action panel on a trip page — its content depends on the current role. */
@Component({
  selector: 'app-trip-actions',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, ParadoxStabilizerComponent],
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
  private readonly notifications = inject(NotificationService);

  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly justBooked = signal(false);
  protected readonly stabilising = signal<ParadoxFeedDto | null>(null);

  protected readonly booking = computed(() =>
    bookingInfo(this.trip(), this.state.currentCustomer()?.guid ?? null, this.agency.trips()),
  );
  protected readonly conflictName = computed(() => {
    const other = this.booking().conflictWith;
    return other ? tripDisplayName(other) : '';
  });
  protected readonly returnAt = computed(() => formatDateTime(this.trip().returnInRealLife));
  protected readonly isUnderWay = computed(() => this.trip().tripStatus === 'Active');

  protected readonly agentRole = computed(() => {
    const agent = this.state.currentAgent();
    if (!agent) return null;
    if (this.trip().licensedAgentId === agent.id) return 'Licensed agent';
    if (this.trip().agentId === agent.id) return 'Support agent';
    return null;
  });
  /** Open paradoxes in queue order — only the first one can be stabilised right now. */
  protected readonly openParadoxes = computed(() => inQueueOrder(this.feed.forTrip(this.trip().guid).filter(isOpenParadox)));
  protected readonly typeLabel = paradoxTypeLabel;
  protected readonly queueLabel = queueLabel;

  /** Why the signed-in agent cannot start a round on this paradox, or null if they can. */
  protected blockText(p: ParadoxFeedDto): string | null {
    const block = stabiliseBlock(p, this.state.currentAgent()?.id);
    return block === 'none' || block === 'closed' ? null : BLOCK_TEXT[block];
  }

  /** Escalated paradoxes that cannot be worked on until the manager assigns a support agent. */
  protected readonly blockedBySupport = computed(() =>
    !this.trip().agentId && this.openParadoxes().some(p => p.dualLockRequired),
  );

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

  protected cancelBooking(): void {
    const customer = this.state.currentCustomer();
    if (!customer) return;
    this.busy.set(true);
    this.error.set(null);
    this.tripApi.cancelBooking(this.trip().guid, customer.guid).subscribe({
      next: () => {
        this.busy.set(false);
        this.notifications.success('Booking cancelled', `You are no longer booked on “${tripDisplayName(this.trip())}”.`);
        this.agency.refresh();
      },
      error: err => {
        this.busy.set(false);
        this.error.set(toErrorMessage(err, 'Cancellation failed.'));
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
