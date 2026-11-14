import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TripDto } from '../../../core/models/trip.model';
import { formatDateTime, formatDuration, tripTiming } from '../../utils/date.utils';
import { tripDisplayName, tripTypeLabel } from '../../utils/status.utils';
import { StatusBadgeComponent } from '../status-badge/status-badge.component';
import { IntegrityGaugeComponent } from '../integrity-gauge/integrity-gauge.component';
import { IconComponent } from '../icon/icon.component';

/** Trip summary card, linking to the trip detail page. Used by every trip grid in the app. */
@Component({
  selector: 'app-trip-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, StatusBadgeComponent, IntegrityGaugeComponent, IconComponent],
  templateUrl: './trip-card.component.html',
  styleUrl: './trip-card.component.css',
})
export class TripCardComponent {
  readonly trip = input.required<TripDto>();
  readonly agentName = input<string | null>(null);
  readonly openParadoxes = input(0);
  /** Optional role-specific note, e.g. "You are the licensed agent". */
  readonly note = input<string | null>(null);
  /** Customer-facing card: hides internal classification (critical / paradoxes). */
  readonly customerView = input(false);

  protected readonly name = computed(() => tripDisplayName(this.trip()));
  protected readonly typeLabel = computed(() => tripTypeLabel(this.trip().tripType));
  protected readonly departure = computed(() => formatDateTime(this.trip().dateInRealLife));
  protected readonly duration = computed(() => formatDuration(this.trip().durationMinutes * 60_000));
  protected readonly until = computed(() => tripTiming(this.trip()));
  protected readonly critical = computed(() => !this.customerView() && this.trip().tripType === 'CriticalTrip');
}
