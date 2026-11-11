import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TripDto } from '../../../core/models/trip.model';
import { formatDateTime, timeUntil } from '../../utils/date.utils';
import { tripDisplayName, tripTypeLabel } from '../../utils/status.utils';
import { StatusBadgeComponent } from '../status-badge/status-badge.component';

/** Trip summary card, linking to the trip detail page. Used by every trip grid in the app. */
@Component({
  selector: 'app-trip-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, StatusBadgeComponent],
  templateUrl: './trip-card.component.html',
  styleUrl: './trip-card.component.css',
})
export class TripCardComponent {
  readonly trip = input.required<TripDto>();
  readonly agentName = input<string | null>(null);
  readonly openParadoxes = input(0);
  /** Optional role-specific note, e.g. "You are the licensed agent". */
  readonly note = input<string | null>(null);

  protected readonly name = computed(() => tripDisplayName(this.trip()));
  protected readonly typeLabel = computed(() => tripTypeLabel(this.trip().tripType));
  protected readonly departure = computed(() => formatDateTime(this.trip().dateInRealLife));
  protected readonly until = computed(() => timeUntil(this.trip().dateInRealLife));
  protected readonly critical = computed(() => this.trip().tripType === 'CriticalTrip');
}
