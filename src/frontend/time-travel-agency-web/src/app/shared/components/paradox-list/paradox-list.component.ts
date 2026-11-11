import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PARADOX_STATUSES, ParadoxFeedDto, ParadoxStatus } from '../../../core/models/paradox.model';
import { paradoxMeta, paradoxTypeColor, paradoxTypeLabel, tripDisplayName } from '../../utils/status.utils';
import { relativeTime } from '../../utils/date.utils';
import { StatusBadgeComponent } from '../status-badge/status-badge.component';

export interface ParadoxStatusChange {
  paradox: ParadoxFeedDto;
  status: ParadoxStatus;
}

/**
 * List of paradox records. Records are append-only (never deleted); when `editable` is set
 * the owning manager can move a paradox through its status workflow.
 */
@Component({
  selector: 'app-paradox-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, StatusBadgeComponent],
  templateUrl: './paradox-list.component.html',
  styleUrl: './paradox-list.component.css',
})
export class ParadoxListComponent {
  readonly paradoxes = input.required<ParadoxFeedDto[]>();
  /** Show which trip each paradox belongs to (for cross-trip lists). */
  readonly showTrip = input(false);
  readonly editable = input(false);
  readonly fresh = input<ReadonlySet<string>>(new Set());
  readonly pending = input<string | null>(null);
  readonly emptyText = input('No paradox incidents recorded.');
  /** When set, open paradoxes get an action button with this label (e.g. agents: "Stabilise"). */
  readonly actionLabel = input<string | null>(null);
  /** Optional lookup for "solved by …" lines. */
  readonly agentName = input<((id: number) => string | null) | null>(null);

  readonly statusChange = output<ParadoxStatusChange>();
  readonly act = output<ParadoxFeedDto>();

  protected readonly statuses = PARADOX_STATUSES;
  protected readonly typeLabel = paradoxTypeLabel;
  protected readonly typeColor = paradoxTypeColor;
  protected readonly statusLabel = (s: string) => paradoxMeta(s).label;
  protected readonly tripName = tripDisplayName;
  protected readonly ago = relativeTime;

  protected onSelect(paradox: ParadoxFeedDto, value: string): void {
    if (value !== paradox.paradoxStatus) this.statusChange.emit({ paradox, status: value as ParadoxStatus });
  }
}
