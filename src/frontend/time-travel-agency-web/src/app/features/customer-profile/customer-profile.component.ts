import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AppStateService } from '../../state/app-state.service';
import { AgencyStore } from '../../state/agency.store';
import { ParadoxFeedStore } from '../../state/paradox-feed.store';
import { TripCardComponent } from '../../shared/components/trip-card/trip-card.component';
import { ParadoxListComponent } from '../../shared/components/paradox-list/paradox-list.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { initials, isOpenParadox } from '../../shared/utils/status.utils';

@Component({
  selector: 'app-customer-profile',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TripCardComponent, ParadoxListComponent, EmptyStateComponent],
  template: `
    <div class="page page--narrow">
      @if (state.currentCustomer(); as c) {
        <div class="identity">
          <span class="avatar avatar--lg">{{ initials(c) }}</span>
          <div>
            <h1 class="display name">{{ c.firstname }} {{ c.lastname }}</h1>
            <div class="muted">{{ c.email }} · {{ c.phoneNumber }}</div>
          </div>
        </div>

        @if (openAlerts().length > 0) {
          <section class="section">
            <h2 class="section-title">Timeline alerts on your journeys</h2>
            <app-paradox-list [paradoxes]="openAlerts()" [showTrip]="true" [fresh]="feed.fresh()" />
          </section>
        }

        <section class="section">
          <h2 class="section-title">Your booked journeys</h2>
          <div class="grid-cards">
            @for (trip of agency.scopedTrips(); track trip.guid) {
              <app-trip-card [trip]="trip" [agentName]="agency.agentName(trip.licensedAgentId)"
                             [openParadoxes]="feed.openCountForTrip(trip.guid)" />
            } @empty {
              <app-empty-state class="span-all" title="No journeys booked yet"
                               message="The timeline awaits. Browse our destinations and secure your passage.">
                <a class="btn btn--primary" routerLink="/">Browse destinations</a>
              </app-empty-state>
            }
          </div>
        </section>
      } @else {
        <app-empty-state title="You are browsing as a guest" message="Sign in or register to book trips and see your journeys.">
          <div class="row row--center">
            <button type="button" class="btn btn--primary" (click)="state.requestRole('customer')">Sign in</button>
            <button type="button" class="btn btn--outline-gold" (click)="state.joinModalOpen.set(true)">Join as traveller</button>
          </div>
        </app-empty-state>
      }
    </div>
  `,
  styles: `
    .identity { display: flex; align-items: center; gap: 22px; margin-bottom: 44px; }
    .name { font-size: 30px; }
    .span-all { grid-column: 1 / -1; }
  `,
})
export class CustomerProfileComponent {
  protected readonly state = inject(AppStateService);
  protected readonly agency = inject(AgencyStore);
  protected readonly feed = inject(ParadoxFeedStore);

  protected readonly initials = initials;
  /** Unresolved paradoxes on trips this customer has booked. */
  protected readonly openAlerts = computed(() => this.feed.scoped().filter(isOpenParadox));
}
