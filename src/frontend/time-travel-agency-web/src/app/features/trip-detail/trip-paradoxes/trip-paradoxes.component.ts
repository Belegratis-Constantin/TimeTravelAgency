import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { ParadoxDto } from '../../../core/models/trip.model';
import { paradoxMeta, paradoxTypeLabel } from '../../../shared/utils/status.utils';
import { ParadoxService } from '../../../core/services/paradox.service';
import { AppStateService } from '../../../state/app-state.service';

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
              <div style="display:flex;justify-content:space-between;align-items:center;font-size:12px;color:#8A93A6;">
                @if (state.isManager()) {
                  <select (change)="changeStatus(p.guid, $any($event.target).value)"
                          [value]="p.paradoxStatus"
                          style="background:#1E2A3A;color:#F0EDE6;border:1px solid #2E3E54;
                                 padding:5px 10px;border-radius:3px;font-size:12px;cursor:pointer;">
                    <option value="InQueue">In Queue</option>
                    <option value="InProcess">In Process</option>
                    <option value="Solved">Solved</option>
                    <option value="Escalated">Escalated</option>
                  </select>
                } @else {
                  <span>🔒 Immutable record</span>
                }
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
  @Output() changed = new EventEmitter<void>();

  private readonly paradoxService = inject(ParadoxService);
  protected readonly state = inject(AppStateService);

  meta(status: string) { return paradoxMeta(status); }
  typeLabel(type: string) { return paradoxTypeLabel(type); }

  changeStatus(paradoxGuid: string, status: string): void {
    const managerGuid = this.state.currentManager()?.guid;
    this.paradoxService.changeStatus(paradoxGuid, status, managerGuid).subscribe({
      next: () => this.changed.emit(),
    });
  }
}
