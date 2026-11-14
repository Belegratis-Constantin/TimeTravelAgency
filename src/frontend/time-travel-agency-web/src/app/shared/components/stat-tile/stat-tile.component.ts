import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Tone } from '../../utils/status.utils';

export interface StatTile {
  label: string;
  value: number | string;
  tone?: Tone;
}

/** Row of KPI tiles used by every dashboard. */
@Component({
  selector: 'app-stat-tiles',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @for (tile of tiles(); track tile.label) {
      <div class="metric" [class]="'tone-' + (tile.tone ?? 'neutral')" [class.zero]="tile.value === 0">
        <div class="label">{{ tile.label }}</div>
        <div class="value">{{ tile.value }}</div>
      </div>
    }
  `,
  styles: `
    /* One strip; each cell draws a hairline on its left and top, the strip's own edge clips the outer ones. */
    :host {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(128px, 1fr)); margin-bottom: 36px; overflow: hidden;
      background: var(--surface); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); box-shadow: var(--shadow-card);
    }
    .metric { --tone: var(--text); padding: 14px 16px 12px; box-shadow: -1px 0 0 var(--border-subtle), 0 -1px 0 var(--border-subtle); }
    .label { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--text-muted); white-space: nowrap; }
    .value { margin-top: 2px; font-size: 26px; font-weight: 600; line-height: 1.2; letter-spacing: -0.03em; font-variant-numeric: tabular-nums; color: var(--text); }
    .metric:not(.tone-neutral) .label::before { content: ''; width: 6px; height: 6px; border-radius: 50%; background: var(--tone); }
    .metric.zero .label::before { background: var(--border); }
    /* Only alarming numbers take colour; everything else stays ink. */
    .tone-red:not(.zero) .value, .tone-amber:not(.zero) .value { color: var(--tone); }
    .tone-blue { --tone: var(--blue); } .tone-amber { --tone: var(--amber); } .tone-red { --tone: var(--red); }
    .tone-green { --tone: var(--green); } .tone-live { --tone: var(--amber); } .tone-violet { --tone: var(--violet); }
    .tone-brand { --tone: var(--brand); }
    .tone-live:not(.zero) .label::before { color: var(--amber); animation: livePulse 1.8s ease-out infinite; }
  `,
})
export class StatTilesComponent {
  readonly tiles = input.required<StatTile[]>();
}
