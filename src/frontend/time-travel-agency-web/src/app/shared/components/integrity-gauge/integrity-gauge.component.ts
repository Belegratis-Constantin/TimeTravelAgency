import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CRITICAL_PARADOX_THRESHOLD } from '../../utils/status.utils';

/**
 * Timeline stability of one trip: one cell per unresolved paradox it can take before it turns critical.
 * Purely presentational — it draws the open-paradox count the feed already provides.
 */
@Component({
  selector: 'app-integrity-gauge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { role: 'img', '[attr.aria-label]': 'label()', '[attr.title]': 'label()', '[class]': '"level-" + level()' },
  template: `
    @for (cell of cells; track cell) {
      <span class="cell" [class.hit]="open() > cell"></span>
    }
    @if (showCount()) { <span class="count">{{ open() }}</span> }
  `,
  styles: `
    :host { --tone: var(--green); display: inline-flex; align-items: center; gap: 3px; vertical-align: middle; }
    :host(.level-1) { --tone: var(--amber); }
    :host(.level-2), :host(.level-3) { --tone: var(--red); }
    .cell {
      width: 14px; height: 6px; border-radius: 2px; background: color-mix(in srgb, var(--green) 55%, var(--surface-sunken));
      transition: background 0.4s var(--ease-out), transform 0.4s var(--ease-out);
    }
    .cell.hit { background: var(--tone); }
    :host(.level-3) .cell { animation: softPulse 1.4s ease-in-out infinite; }
    .count { margin-left: 5px; min-width: 1ch; font-size: 12px; font-weight: 600; font-variant-numeric: tabular-nums; color: var(--tone); }
    :host(.level-0) .count { color: var(--text-faint); font-weight: 500; }
  `,
})
export class IntegrityGaugeComponent {
  /** Unresolved paradoxes on the trip. */
  readonly open = input.required<number>();
  readonly showCount = input(true);

  protected readonly cells = Array.from({ length: CRITICAL_PARADOX_THRESHOLD }, (_, i) => i);
  protected readonly level = computed(() => Math.min(this.open(), CRITICAL_PARADOX_THRESHOLD));
  protected readonly label = computed(() => {
    const open = this.open();
    if (open === 0) return 'Timeline stable — no open paradoxes';
    const left = CRITICAL_PARADOX_THRESHOLD - open;
    return left > 0
      ? `${open} open paradox${open === 1 ? '' : 'es'} — ${left} more and the trip turns critical`
      : `${open} open paradoxes — critical`;
  });
}
