import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PARADOX_STATUSES, ParadoxFeedDto, ParadoxStatus } from '../../../core/models/paradox.model';
import { paradoxMeta, paradoxTypeColor, paradoxTypeLabel, tripDisplayName } from '../../utils/status.utils';
import { relativeTime } from '../../utils/date.utils';
import { queueLabel } from '../../utils/paradox-queue.utils';
import { StatusBadgeComponent } from '../status-badge/status-badge.component';

export interface ParadoxStatusChange {
  paradox: ParadoxFeedDto;
  status: ParadoxStatus;
}

export interface ParadoxQueueMove {
  paradox: ParadoxFeedDto;
  /** New place in the trip's queue (0 = worked on now). */
  position: number;
}

/**
 * List of paradox records. Records are append-only (never deleted). Each trip works its open paradoxes one at a time
 * (queue badge: Now / Next / #n); when `editable` is set the owning manager can move a paradox through its status
 * workflow and reorder the trip's queue.
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
  /** Decides per paradox whether the action button is shown (default: every open paradox). */
  readonly canAct = input<((p: ParadoxFeedDto) => boolean) | null>(null);
  /** Optional hint shown instead of the button when `canAct` says no. */
  readonly actionHint = input<((p: ParadoxFeedDto) => string | null) | null>(null);
  /** Optional lookup for "solved by …" lines. */
  readonly agentName = input<((id: number) => string | null) | null>(null);

  readonly statusChange = output<ParadoxStatusChange>();
  readonly move = output<ParadoxQueueMove>();
  readonly act = output<ParadoxFeedDto>();

  protected readonly statuses = PARADOX_STATUSES;
  protected readonly typeLabel = paradoxTypeLabel;
  protected readonly typeColor = paradoxTypeColor;
  protected readonly statusLabel = (s: string) => paradoxMeta(s).label;
  protected readonly tripName = tripDisplayName;
  protected readonly ago = relativeTime;
  protected readonly queueLabel = queueLabel;

  /** Number of open paradoxes per trip in this list — the last one in a queue cannot move further down. */
  protected readonly queueLength = computed(() => {
    const map = new Map<string, number>();
    for (const p of this.paradoxes()) if (p.queuePosition != null) map.set(p.tripGuid, (map.get(p.tripGuid) ?? 0) + 1);
    return map;
  });

  protected isLastInQueue(p: ParadoxFeedDto): boolean {
    return p.queuePosition != null && p.queuePosition >= (this.queueLength().get(p.tripGuid) ?? 1) - 1;
  }

  protected moveBy(paradox: ParadoxFeedDto, delta: number): void {
    if (paradox.queuePosition == null) return;
    this.move.emit({ paradox, position: Math.max(0, paradox.queuePosition + delta) });
  }

  protected showAction(p: ParadoxFeedDto): boolean {
    if (!this.actionLabel() || p.paradoxStatus === 'Solved') return false;
    const can = this.canAct();
    return can ? can(p) : true;
  }

  protected hintFor(p: ParadoxFeedDto): string | null {
    if (!this.actionLabel() || p.paradoxStatus === 'Solved' || this.showAction(p)) return null;
    return this.actionHint()?.(p) ?? null;
  }

  protected onSelect(paradox: ParadoxFeedDto, value: string): void {
    if (value !== paradox.paradoxStatus) this.statusChange.emit({ paradox, status: value as ParadoxStatus });
  }
}
