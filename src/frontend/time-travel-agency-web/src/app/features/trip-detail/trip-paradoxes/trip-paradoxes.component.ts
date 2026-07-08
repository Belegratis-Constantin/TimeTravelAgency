import { Component, Input } from '@angular/core';
import { ParadoxDto } from '../../../core/models/trip.model';
import { paradoxMeta, paradoxTypeLabel } from '../../../shared/utils/status.utils';

@Component({
  selector: 'app-trip-paradoxes',
  standalone: true,
  template: `
    <div>
      <div style="font-family:'Fraunces',serif;font-size:20px;margin-bottom:18px;">Paradox Log</div>

      @if (paradoxes.length > 0) {
        <div style="display:flex;flex-direction:column;gap:14px;">
          @for (p of paradoxes; track p.guid) {
            <div [style.borderLeftColor]="meta(p.paradoxStatus).color"
                 style="background:#241A1A;border:1px solid #3A2626;border-left-width:3px;
                        border-radius:4px;padding:16px 20px;">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                <span style="font-size:14px;font-weight:600;">{{ typeLabel(p.paradoxType) }}</span>
                <span [style.background]="meta(p.paradoxStatus).bg"
                      [style.color]="meta(p.paradoxStatus).color"
                      style="font-size:11px;font-weight:600;padding:3px 10px;border-radius:20px;">
                  {{ meta(p.paradoxStatus).label }}
                </span>
              </div>
              <div style="display:flex;justify-content:space-between;font-size:12px;color:#8A93A6;">
                <span>🔒 Immutable record</span>
              </div>
            </div>
          }
        </div>
      } @else {
        <div style="color:#6B7488;font-size:13.5px;font-style:italic;">
          No paradox incidents recorded for this trip.
        </div>
      }
    </div>
  `,
})
export class TripParadoxesComponent {
  @Input() paradoxes: ParadoxDto[] = [];

  meta(status: string) { return paradoxMeta(status); }
  typeLabel(type: string) { return paradoxTypeLabel(type); }
}
