import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TripDto } from '../../core/models/trip.model';
import { AppStateService } from '../../state/app-state.service';
import { AgencyStore } from '../../state/agency.store';
import { TripCardComponent } from '../../shared/components/trip-card/trip-card.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { bookingState } from '../../shared/utils/booking.utils';
import { tripDisplayName } from '../../shared/utils/status.utils';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { ERA_ZONES, formatYear } from '../era-timeline/era-timeline.config';

type SortOrder = 'soonest' | 'latest';
type Timeframe = 'upcoming' | 'underway' | 'past' | 'all';

const TIMEFRAME_STATUS: Record<Exclude<Timeframe, 'all'>, string[]> = {
  upcoming: ['Scheduled'],
  underway: ['Active'],
  past: ['Completed', 'Cancelled'],
};

@Component({
  selector: 'app-landing',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TripCardComponent, EmptyStateComponent, IconComponent],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.css',
})
export class LandingComponent {
  protected readonly state = inject(AppStateService);
  protected readonly agency = inject(AgencyStore);

  protected readonly eras = ERA_ZONES;
  protected readonly formatYear = formatYear;

  protected readonly destination = signal('all');
  protected readonly timeframe = signal<Timeframe>('upcoming');
  protected readonly sortOrder = signal<SortOrder>('soonest');
  protected readonly bookableOnly = signal(false);

  protected readonly destinations = computed(() =>
    [...new Set(this.agency.trips().map(tripDisplayName))].sort((a, b) => a.localeCompare(b)),
  );

  protected readonly trips = computed((): TripDto[] => {
    const destination = this.destination();
    const timeframe = this.timeframe();
    const customerGuid = this.state.currentCustomer()?.guid ?? null;
    const direction = this.sortOrder() === 'soonest' ? 1 : -1;

    return this.agency.trips()
      .filter(t => destination === 'all' || tripDisplayName(t) === destination)
      .filter(t => timeframe === 'all' || TIMEFRAME_STATUS[timeframe].includes(t.tripStatus))
      .filter(t => !this.bookableOnly() || bookingState(t, customerGuid, this.agency.trips()) === 'bookable')
      .sort((a, b) => direction * (Date.parse(a.dateInRealLife) - Date.parse(b.dateInRealLife)));
  });

  protected isBooked(trip: TripDto): boolean {
    const guid = this.state.currentCustomer()?.guid;
    return !!guid && trip.customers.some(c => c.guid === guid);
  }

  protected resetFilters(): void {
    this.destination.set('all');
    this.timeframe.set('upcoming');
    this.bookableOnly.set(false);
  }
}
