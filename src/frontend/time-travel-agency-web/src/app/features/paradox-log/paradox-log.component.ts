import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { PARADOX_STATUSES, ParadoxStatus } from '../../core/models/paradox.model';
import { AppStateService } from '../../state/app-state.service';
import { ParadoxFeedStore } from '../../state/paradox-feed.store';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { ParadoxListComponent } from '../../shared/components/paradox-list/paradox-list.component';
import { isOpenParadox, paradoxMeta, paradoxTypeLabel, PARADOX_TYPES } from '../../shared/utils/status.utils';

type StatusFilter = 'open' | 'all' | ParadoxStatus;

/** Live, cross-trip paradox log. Managers work their own trips' paradoxes; the director observes all. */
@Component({
  selector: 'app-paradox-log',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageHeaderComponent, ParadoxListComponent],
  template: `
    <div class="page page--narrow">
      <app-page-header title="Paradox Log" [eyebrow]="state.isManager() ? 'Your trips' : 'All trips'"
                       subtitle="Records are append-only: a paradox can be resolved, but never deleted. New incidents appear live.">
        <span class="badge badge--neutral">🔒 Immutable records</span>
      </app-page-header>

      <div class="row filters" role="group" aria-label="Filter by status">
        @for (f of statusFilters(); track f.value) {
          <button type="button" class="chip" [class.active]="status() === f.value" (click)="status.set(f.value)">
            {{ f.label }} <span class="count">{{ f.count }}</span>
          </button>
        }
        <label class="sr-only" for="type-filter">Paradox type</label>
        <select id="type-filter" class="select select--compact" [value]="type()" (change)="type.set($any($event.target).value)">
          <option value="all">All types</option>
          @for (t of types; track t) { <option [value]="t">{{ typeLabel(t) }}</option> }
        </select>
      </div>

      <app-paradox-list [paradoxes]="filtered()" [showTrip]="true" [editable]="state.isManager()"
                        [fresh]="feed.fresh()" [pending]="feed.pendingStatus()"
                        (statusChange)="feed.changeStatus($event.paradox, $event.status)"
                        (move)="feed.moveInQueue($event.paradox, $event.position)"
                        emptyText="No paradoxes match this filter." />
    </div>
  `,
  styles: `
    .filters { margin-bottom: 24px; }
    .chip { display: inline-flex; gap: 6px; align-items: center; padding: 6px 12px; border-radius: var(--radius-pill);
            border: 1px solid var(--border); background: transparent; color: var(--text-2); font-size: 12.5px; cursor: pointer; }
    .chip.active { border-color: var(--gold); color: var(--gold); }
    .count { color: var(--text-faint); }
  `,
})
export class ParadoxLogComponent {
  protected readonly state = inject(AppStateService);
  protected readonly feed = inject(ParadoxFeedStore);

  protected readonly types = PARADOX_TYPES;
  protected readonly typeLabel = paradoxTypeLabel;
  protected readonly status = signal<StatusFilter>('open');
  protected readonly type = signal('all');

  protected readonly statusFilters = computed(() => {
    const all = this.feed.scoped();
    return [
      { value: 'open' as StatusFilter, label: 'Open', count: all.filter(isOpenParadox).length },
      { value: 'all' as StatusFilter, label: 'All', count: all.length },
      ...PARADOX_STATUSES.map(s => ({
        value: s as StatusFilter, label: paradoxMeta(s).label, count: all.filter(p => p.paradoxStatus === s).length,
      })),
    ];
  });

  protected readonly filtered = computed(() => {
    const status = this.status();
    const type = this.type();
    return this.feed.scoped()
      .filter(p => status === 'all' || (status === 'open' ? isOpenParadox(p) : p.paradoxStatus === status))
      .filter(p => type === 'all' || p.paradoxType === type);
  });
}
