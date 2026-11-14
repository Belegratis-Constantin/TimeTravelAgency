import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AppStateService } from '../../state/app-state.service';
import { AgencyStore } from '../../state/agency.store';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { tripDisplayName } from '../../shared/utils/status.utils';

/** Read-only archive of field reports (agents file them on their missions page). */
@Component({
  selector: 'app-reports',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, RouterLink, PageHeaderComponent, EmptyStateComponent],
  template: `
    <div class="page page--narrow">
      <app-page-header title="Field Reports" [eyebrow]="state.isManager() ? 'Your trips' : 'All trips'"
                       subtitle="Reports filed by agents in the field, newest first.">
        <label class="sr-only" for="report-trip-filter">Trip</label>
        <select id="report-trip-filter" class="select select--compact" [value]="tripFilter()"
                (change)="tripFilter.set($any($event.target).value)">
          <option value="all">All trips</option>
          @for (t of tripsWithReports(); track t.guid) { <option [value]="t.guid">{{ t.name }}</option> }
        </select>
      </app-page-header>

      @if (agency.initialLoading()) {
        <p class="state-msg">Loading reports…</p>
      } @else {
        <div class="stack">
          @for (r of reports(); track r.guid) {
            <article class="card report">
              <div class="row row--between">
                <h2 class="header">{{ r.header }}</h2>
                <span class="mono faint">{{ r.date | date: 'medium' }}</span>
              </div>
              <a class="trip" [routerLink]="['/trip', r.tripGuid]">{{ r.tripName }}</a>
              <p>{{ r.content ?? 'No content provided.' }}</p>
            </article>
          } @empty {
            <app-empty-state title="No field reports on record" />
          }
        </div>
      }
    </div>
  `,
  styles: `
    .stack { gap: 8px; }
    .report { padding: 16px 20px; }
    .header { font-size: 15px; }
    .trip { display: inline-block; font-size: 12.5px; font-weight: 500; margin-top: 2px; }
    .report p { margin: 8px 0 0; color: var(--text-2); line-height: 1.65; max-width: 72ch; }
  `,
})
export class ReportsComponent {
  protected readonly state = inject(AppStateService);
  protected readonly agency = inject(AgencyStore);
  protected readonly tripFilter = signal('all');

  private readonly allReports = computed(() =>
    this.agency.scopedTrips()
      .flatMap(t => t.reports.map(r => ({ ...r, tripGuid: t.guid, tripName: tripDisplayName(t) })))
      .sort((a, b) => Date.parse(b.date) - Date.parse(a.date)),
  );

  protected readonly tripsWithReports = computed(() =>
    this.agency.scopedTrips().filter(t => t.reports.length > 0).map(t => ({ guid: t.guid, name: tripDisplayName(t) })),
  );

  protected readonly reports = computed(() => {
    const filter = this.tripFilter();
    return filter === 'all' ? this.allReports() : this.allReports().filter(r => r.tripGuid === filter);
  });
}
