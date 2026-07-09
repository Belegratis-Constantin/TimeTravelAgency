import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TripService } from '../../core/services/trip.service';
import { AppStateService } from '../../state/app-state.service';
import { TripDto, ReportDto } from '../../core/models/trip.model';
import { formatDateTime } from '../../shared/utils/date.utils';

interface ReportRow {
  header: string;
  date: string;
  tripName: string;
  content: string | null;
}

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div style="max-width:900px;margin:0 auto;padding:40px 56px 100px;">
      <div style="font-family:'Fraunces',serif;font-size:28px;margin-bottom:8px;">Agent Reports</div>
      <div style="color:#6B7488;font-size:13.5px;margin-bottom:36px;">
        Field reports filed by licensed agents.
      </div>

      @if (state.isAgent() && state.currentAgent()) {
        <div style="background:#1E2A3A;border-radius:4px;padding:32px 36px;margin-bottom:48px;">
          <div style="font-family:'Fraunces',serif;font-size:19px;margin-bottom:20px;">File Field Report</div>

          <div style="display:flex;flex-direction:column;gap:14px;margin-bottom:20px;">
            <div>
              <div style="font-size:11.5px;color:#8A93A6;margin-bottom:6px;letter-spacing:0.06em;text-transform:uppercase;">
                Trip
              </div>
              <select [(ngModel)]="selectedTripGuid"
                      style="width:100%;background:#0B1120;border:1px solid #2E3E54;color:#F0EDE6;
                             padding:11px 14px;border-radius:3px;font-size:13.5px;">
                <option value="">Select a trip…</option>
                @for (t of agentTrips(); track t.guid) {
                  <option [value]="t.guid">{{ t.tripName ?? 'Uncatalogued' }}</option>
                }
              </select>
            </div>

            <div>
              <div style="font-size:11.5px;color:#8A93A6;margin-bottom:6px;letter-spacing:0.06em;text-transform:uppercase;">
                Report Header
              </div>
              <input [(ngModel)]="reportHeader" placeholder="e.g. Field Debrief — Week 3"
                     style="width:100%;background:#0B1120;border:1px solid #2E3E54;color:#F0EDE6;
                            padding:11px 14px;border-radius:3px;font-size:13.5px;" />
            </div>

            <div>
              <div style="font-size:11.5px;color:#8A93A6;margin-bottom:6px;letter-spacing:0.06em;text-transform:uppercase;">
                Content (optional)
              </div>
              <textarea [(ngModel)]="reportContent" rows="5" placeholder="Describe the field observations…"
                        style="width:100%;background:#0B1120;border:1px solid #2E3E54;color:#F0EDE6;
                               padding:11px 14px;border-radius:3px;font-size:13.5px;
                               resize:vertical;font-family:inherit;"></textarea>
            </div>
          </div>

          @if (submitError()) {
            <div style="color:#E05A4E;font-size:12.5px;margin-bottom:14px;">{{ submitError() }}</div>
          }
          @if (submitSuccess()) {
            <div style="color:#3FAE79;font-size:12.5px;margin-bottom:14px;">Report filed successfully.</div>
          }

          <div style="display:flex;justify-content:flex-end;">
            <button (click)="submitReport()" [disabled]="submitting()"
                    style="background:#C9A84C;border:none;color:#0B1120;font-weight:600;
                           font-size:13.5px;padding:10px 22px;border-radius:3px;cursor:pointer;">
              {{ submitting() ? 'Filing…' : 'File Report' }}
            </button>
          </div>
        </div>
      }

      @if (loading()) {
        <div style="color:#6B7488;padding:40px 0;">Loading reports…</div>
      }

      @if (!loading()) {
        <div style="display:flex;flex-direction:column;gap:24px;">
          @for (r of rows(); track r.header + r.date) {
            <div style="background:#1E2A3A;border-radius:4px;padding:32px 36px;">
              <div style="display:flex;justify-content:space-between;align-items:baseline;
                          margin-bottom:6px;flex-wrap:wrap;gap:8px;">
                <div style="font-family:'Fraunces',serif;font-size:19px;">{{ r.header }}</div>
                <div style="font-family:'IBM Plex Mono',monospace;font-size:11.5px;color:#6B7488;">
                  {{ r.date }}
                </div>
              </div>
              <div style="font-size:12.5px;color:#C9A84C;margin-bottom:16px;">
                {{ r.tripName }}
              </div>
              <div style="font-size:14px;color:#B7BFCC;line-height:1.75;">
                {{ r.content ?? 'No content provided.' }}
              </div>
            </div>
          }

          @if (rows().length === 0) {
            <div style="color:#6B7488;font-size:13.5px;font-style:italic;">No field reports on record.</div>
          }
        </div>
      }
    </div>
  `,
})
export class ReportsComponent implements OnInit {
  private readonly tripService = inject(TripService);
  protected readonly state = inject(AppStateService);
  private readonly route = inject(ActivatedRoute);

  readonly loading = signal(true);
  readonly rows = signal<ReportRow[]>([]);
  private readonly allTrips = signal<TripDto[]>([]);

  readonly submitting = signal(false);
  readonly submitError = signal('');
  readonly submitSuccess = signal(false);

  selectedTripGuid = '';
  reportHeader = '';
  reportContent = '';

  readonly agentTrips = computed((): TripDto[] => {
    const agent = this.state.currentAgent();
    if (!agent) return [];
    return this.allTrips().filter(t => t.licensedAgentId === agent.id);
  });

  ngOnInit(): void {
    const tripParam = this.route.snapshot.queryParamMap.get('trip');
    if (tripParam) this.selectedTripGuid = tripParam;

    this.loadReports();
  }

  private loadReports(): void {
    this.loading.set(true);
    this.tripService.getAll().subscribe({
      next: trips => {
        this.allTrips.set(trips);
        const rows: ReportRow[] = trips.flatMap(t =>
          t.reports.map(r => ({
            header: r.header,
            date: formatDateTime(r.date),
            tripName: t.tripName ?? 'Uncatalogued',
            content: r.content,
          }))
        ).sort((a, b) => b.date.localeCompare(a.date));
        this.rows.set(rows);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  submitReport(): void {
    const agent = this.state.currentAgent();
    if (!agent) return;

    if (!this.selectedTripGuid) {
      this.submitError.set('Please select a trip.');
      return;
    }
    if (!this.reportHeader.trim()) {
      this.submitError.set('Report header is required.');
      return;
    }

    this.submitting.set(true);
    this.submitError.set('');
    this.submitSuccess.set(false);

    this.tripService.fileReport(this.selectedTripGuid, agent.guid, {
      header: this.reportHeader.trim(),
      content: this.reportContent.trim() || null,
    }).subscribe({
      next: () => {
        this.submitting.set(false);
        this.submitSuccess.set(true);
        this.reportHeader = '';
        this.reportContent = '';
        this.loadReports();
      },
      error: (err) => {
        this.submitting.set(false);
        this.submitError.set(err?.error ?? 'Failed to file report.');
      },
    });
  }
}
