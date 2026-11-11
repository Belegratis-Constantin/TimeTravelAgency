import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TripDto } from '../../core/models/trip.model';
import { AppStateService } from '../../state/app-state.service';
import { AgencyStore } from '../../state/agency.store';
import { ParadoxFeedStore } from '../../state/paradox-feed.store';
import { TripCardComponent } from '../../shared/components/trip-card/trip-card.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { bookingState } from '../../shared/utils/booking.utils';
import { tripDisplayName } from '../../shared/utils/status.utils';

type SortOrder = 'soonest' | 'latest';

@Component({
  selector: 'app-landing',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TripCardComponent, EmptyStateComponent],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.css',
})
export class LandingComponent {
  protected readonly state = inject(AppStateService);
  protected readonly agency = inject(AgencyStore);
  protected readonly feed = inject(ParadoxFeedStore);

  protected readonly destination = signal('all');
  protected readonly tripType = signal('all');
  protected readonly sortOrder = signal<SortOrder>('soonest');
  protected readonly bookableOnly = signal(false);

  protected readonly destinations = computed(() =>
    [...new Set(this.agency.trips().map(tripDisplayName))].sort((a, b) => a.localeCompare(b)),
  );

  protected readonly trips = computed((): TripDto[] => {
    const destination = this.destination();
    const type = this.tripType();
    const customerGuid = this.state.currentCustomer()?.guid ?? null;
    const direction = this.sortOrder() === 'soonest' ? 1 : -1;

    return this.agency.trips()
      .filter(t => destination === 'all' || tripDisplayName(t) === destination)
      .filter(t => type === 'all' || t.tripType === type)
      .filter(t => !this.bookableOnly() || bookingState(t, customerGuid) === 'bookable')
      .sort((a, b) => direction * (Date.parse(a.dateInRealLife) - Date.parse(b.dateInRealLife)));
  });

  protected isBooked(trip: TripDto): boolean {
    const guid = this.state.currentCustomer()?.guid;
    return !!guid && trip.customers.some(c => c.guid === guid);
  }

  protected resetFilters(): void {
    this.destination.set('all');
    this.tripType.set('all');
    this.bookableOnly.set(false);
  }
}
