import { Component, Input, Output, EventEmitter } from '@angular/core';
import { tripStatusMeta, tripTypeLabel } from '../../../shared/utils/status.utils';
import { formatDateTime, timeUntil } from '../../../shared/utils/date.utils';
import { TripDto } from '../../../core/models/trip.model';

@Component({
  selector: 'app-trip-card',
  standalone: true,
  templateUrl: './trip-card.component.html',
})
export class TripCardComponent {
  @Input({ required: true }) trip!: TripDto;
  @Input() agentName = 'Unknown Agent';
  @Output() selected = new EventEmitter<string>();

  get statusMeta() { return tripStatusMeta(this.trip.tripStatus); }
  get departure() { return formatDateTime(this.trip.dateInRealLife); }
  get until() { return timeUntil(this.trip.dateInRealLife); }
  get displayName() { return this.trip.tripName ?? 'Uncatalogued Destination'; }
  get typeLabel() { return tripTypeLabel(this.trip.tripType); }
}
