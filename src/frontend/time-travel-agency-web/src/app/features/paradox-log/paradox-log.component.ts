import { Component, OnInit, inject, signal } from '@angular/core';
import { TripService } from '../../core/services/trip.service';
import { TripDto, ParadoxDto } from '../../core/models/trip.model';
import { paradoxMeta, paradoxTypeLabel } from '../../shared/utils/status.utils';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';

interface ParadoxRow {
  tripName: string;
  paradoxType: string;
  paradoxStatus: string;
}

@Component({
  selector: 'app-paradox-log',
  standalone: true,
  imports: [StatusBadgeComponent],
  template: `
    <div style="max-width:1200px;margin:0 auto;padding:40px 56px 100px;">
      <div style="display:flex;justify-content:space-between;align-items:center;
                  margin-bottom:8px;flex-wrap:wrap;gap:12px;">
        <div style="font-family:'Fraunces',serif;font-size:28px;">Paradox Log</div>
        <div style="display:flex;align-items:center;gap:8px;font-size:12.5px;color:#8A93A6;
                    background:#1E2A3A;border:1px solid #2A3A50;padding:8px 14px;border-radius:20px;">
          🔒 Records are immutable — none may be deleted or altered once filed
        </div>
      </div>
      <div style="color:#6B7488;font-size:13.5px;margin-bottom:32px;">
        Every recorded incident across all trips, permanently retained for institutional review.
      </div>

      @if (loading()) {
        <div style="color:#6B7488;padding:40px 0;">Loading paradox records…</div>
      }

      @if (!loading()) {
        <div style="background:#1E2A3A;border-radius:4px;overflow:hidden;">
          <div style="display:grid;grid-template-columns:1.8fr 1.6fr 1fr 0.4fr;
                      padding:14px 22px;font-size:11px;color:#6B7488;letter-spacing:0.08em;
                      text-transform:uppercase;border-bottom:1px solid #2A3A50;">
            <span>Trip</span><span>Paradox Type</span><span>Status</span><span></span>
          </div>

          @for (row of rows(); track row.tripName + row.paradoxType) {
            <div style="display:grid;grid-template-columns:1.8fr 1.6fr 1fr 0.4fr;
                        padding:16px 22px;align-items:center;border-bottom:1px solid #2A3A50;font-size:13.5px;">
              <span style="font-weight:600;">{{ row.tripName }}</span>
              <span style="color:#B7BFCC;">{{ row.paradoxType }}</span>
              <app-status-badge [status]="row.paradoxStatus" type="paradox" />
              <span style="color:#3E4E64;font-size:15px;" title="Immutable — cannot be deleted">🔒</span>
            </div>
          }

          @if (rows().length === 0) {
            <div style="padding:40px 22px;color:#6B7488;font-size:13.5px;font-style:italic;">
              No paradox incidents on record.
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class ParadoxLogComponent implements OnInit {
  private readonly tripService = inject(TripService);

  readonly loading = signal(true);
  readonly rows = signal<ParadoxRow[]>([]);

  ngOnInit(): void {
    this.tripService.getAll().subscribe(trips => {
      const rows: ParadoxRow[] = trips.flatMap(t =>
        t.paradoxes.map(p => ({
          tripName: t.tripName ?? 'Uncatalogued',
          paradoxType: paradoxTypeLabel(p.paradoxType),
          paradoxStatus: p.paradoxStatus,
        }))
      );
      this.rows.set(rows);
      this.loading.set(false);
    });
  }
}
