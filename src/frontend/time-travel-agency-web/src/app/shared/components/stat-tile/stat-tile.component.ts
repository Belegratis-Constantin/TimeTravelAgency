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
      <div class="card tile">
        <div class="value display" [class]="'tone-' + (tile.tone ?? 'neutral')">{{ tile.value }}</div>
        <div class="label">{{ tile.label }}</div>
      </div>
    }
  `,
  styles: `
    :host { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 16px; margin-bottom: 44px; }
    .tile { padding: 22px; }
    .value { font-size: 32px; line-height: 1.1; }
    .label { margin-top: 6px; font-size: 11.5px; color: var(--text-muted); letter-spacing: 0.06em; text-transform: uppercase; }
    .tone-blue { color: var(--blue); } .tone-amber { color: var(--amber); } .tone-red { color: var(--red); }
    .tone-green { color: var(--green); } .tone-gold { color: var(--gold); } .tone-violet { color: var(--violet); }
  `,
})
export class StatTilesComponent {
  readonly tiles = input.required<StatTile[]>();
}
