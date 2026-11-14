import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AppStateService } from '../../state/app-state.service';
import { AgencyStore } from '../../state/agency.store';
import { TripCardComponent } from '../../shared/components/trip-card/trip-card.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { initials } from '../../shared/utils/status.utils';

@Component({
  selector: 'app-customer-profile',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TripCardComponent, EmptyStateComponent],
  template: `
    <div class="page page--narrow">
      @if (state.currentCustomer(); as c) {
        <div class="identity">
          <span class="avatar avatar--lg">{{ initials(c) }}</span>
          <div>
            <h1 class="name">{{ c.firstname }} {{ c.lastname }}</h1>
            <div class="muted">{{ c.email }} · {{ c.phoneNumber }}</div>
          </div>
        </div>

        @if (current(); as trip) {
          <section class="section">
            <h2 class="section-title">Travelling right now</h2>
            <div class="grid-cards">
              <app-trip-card [trip]="trip" [agentName]="agency.agentName(trip.licensedAgentId)" [customerView]="true" />
            </div>
          </section>
        }

        <section class="section">
          <h2 class="section-title">Upcoming journeys</h2>
          <div class="grid-cards">
            @for (trip of upcoming(); track trip.guid) {
              <app-trip-card [trip]="trip" [agentName]="agency.agentName(trip.licensedAgentId)" [customerView]="true" />
            } @empty {
              <app-empty-state class="span-all" title="No upcoming journeys"
                               message="The timeline awaits. Browse our destinations and secure your passage.">
                <a class="btn btn--primary" routerLink="/">Browse destinations</a>
              </app-empty-state>
            }
          </div>
        </section>

        @if (past().length > 0) {
          <section class="section">
            <h2 class="section-title">Past journeys</h2>
            <div class="grid-cards">
              @for (trip of past(); track trip.guid) {
                <app-trip-card [trip]="trip" [agentName]="agency.agentName(trip.licensedAgentId)" [customerView]="true" />
              }
            </div>
          </section>
        }
      } @else {
        <app-empty-state title="You are browsing as a guest" message="Sign in or register to book trips and see your journeys.">
          <div class="row row--center">
            <button type="button" class="btn btn--primary" (click)="state.requestRole('customer')">Sign in</button>
            <button type="button" class="btn btn--accent" (click)="state.joinModalOpen.set(true)">Join as traveller</button>
          </div>
        </app-empty-state>
      }
    </div>
  `,
  styles: `
    .identity { display: flex; align-items: center; gap: 16px; margin-bottom: 32px; }
    .name { font-size: 24px; letter-spacing: -0.025em; }
    .span-all { grid-column: 1 / -1; }
  `,
})
export class CustomerProfileComponent {
  protected readonly state = inject(AppStateService);
  protected readonly agency = inject(AgencyStore);

  protected readonly initials = initials;

  private readonly byDeparture = computed(() =>
    [...this.agency.scopedTrips()].sort((a, b) => Date.parse(a.dateInRealLife) - Date.parse(b.dateInRealLife)),
  );
  /** A traveller can only be on one trip at a time — bookings never overlap. */
  protected readonly current = computed(() => this.byDeparture().find(t => t.tripStatus === 'Active') ?? null);
  protected readonly upcoming = computed(() => this.byDeparture().filter(t => t.tripStatus === 'Scheduled'));
  protected readonly past = computed(() =>
    this.byDeparture().filter(t => t.tripStatus === 'Completed' || t.tripStatus === 'Cancelled').reverse(),
  );
}
