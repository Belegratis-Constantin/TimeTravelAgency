import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ERA_ZONES, EraZone, formatYear, RISK_COLORS, TOTAL_W, TripPin, ZONE_W } from '../era-timeline.config';

/** Bottom "mission clock": minimap of all eras and trips, click to seek. */
@Component({
  selector: 'app-timeline-scrubber',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './timeline-scrubber.component.html',
  styleUrl: './timeline-scrubber.component.css',
  host: { '[style.--accent]': 'activeZone().accent' },
})
export class TimelineScrubberComponent {
  readonly pins = input.required<TripPin[]>();
  readonly activeZone = input.required<EraZone>();
  readonly currentYear = input.required<number>();
  /** Visible part of the timeline, in percent of the total width. */
  readonly viewportLeft = input.required<number>();
  readonly viewportWidth = input.required<number>();
  /** Requested position as fraction (0–1) of the whole timeline. */
  readonly seek = output<number>();

  protected readonly eraZones = ERA_ZONES;
  protected readonly zoneWidth = ZONE_W;
  protected readonly totalWidth = TOTAL_W;
  protected readonly riskColors = RISK_COLORS;
  protected readonly formatYear = formatYear;

  protected onClick(event: MouseEvent): void {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    this.seek.emit(Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)));
  }
}
