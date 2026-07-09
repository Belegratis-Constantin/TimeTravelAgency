import { Component, OnInit, inject, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import { DirectorService } from '../../core/services/director.service';
import { AppStateService } from '../../state/app-state.service';
import { SystemStatsDto } from '../../core/models/director.model';
import { ManagerWithIdDto } from '../../core/models/manager.model';
import { AgentDto } from '../../core/models/agent.model';
import { CreateManagerModalComponent } from '../modals/create-manager-modal/create-manager-modal.component';

@Component({
  selector: 'app-director-dashboard',
  standalone: true,
  imports: [CreateManagerModalComponent],
  template: `
    <div style="max-width:1360px;margin:0 auto;padding:56px;">

      <!-- Header -->
      <div style="margin-bottom:48px;">
        <div style="font-size:11px;color:#8A93A6;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:8px;">
          Director · Command Centre
        </div>
        <div style="font-family:'Fraunces',serif;font-size:38px;margin-bottom:8px;">
          {{ state.currentDirector()?.name }}
        </div>
        <div style="color:#6B7488;font-size:14px;">
          System-wide oversight — all operations, all eras.
        </div>
        <button (click)="showCreateManager.set(true)"
                style="margin-top:16px;background:#C9A84C;border:none;color:#0B1120;font-weight:600;
                       font-size:13px;padding:10px 20px;border-radius:2px;cursor:pointer;">
          + Add Manager
        </button>
      </div>

      @if (loading()) {
        <div style="color:#6B7488;font-size:14px;padding:80px 0;text-align:center;">
          Loading command data…
        </div>
      }

      @if (!loading()) {
        <!-- System stats -->
        @if (stats()) {
          <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:16px;margin-bottom:48px;">
            <div style="background:#1E2A3A;border-radius:4px;padding:20px;text-align:center;">
              <div style="font-family:'Fraunces',serif;font-size:28px;">{{ stats()!.totalTrips }}</div>
              <div style="font-size:11px;color:#8A93A6;text-transform:uppercase;letter-spacing:0.05em;margin-top:4px;">Trips</div>
            </div>
            <div style="background:#1E2A3A;border-radius:4px;padding:20px;text-align:center;">
              <div style="font-family:'Fraunces',serif;font-size:28px;color:#E05A4E;">{{ stats()!.criticalTripCount }}</div>
              <div style="font-size:11px;color:#8A93A6;text-transform:uppercase;letter-spacing:0.05em;margin-top:4px;">Critical</div>
            </div>
            <div style="background:#1E2A3A;border-radius:4px;padding:20px;text-align:center;">
              <div style="font-family:'Fraunces',serif;font-size:28px;color:#D9A24E;">{{ stats()!.totalParadoxes }}</div>
              <div style="font-size:11px;color:#8A93A6;text-transform:uppercase;letter-spacing:0.05em;margin-top:4px;">Paradoxes</div>
            </div>
            <div style="background:#1E2A3A;border-radius:4px;padding:20px;text-align:center;">
              <div style="font-family:'Fraunces',serif;font-size:28px;color:#E05A4E;">{{ stats()!.openParadoxes }}</div>
              <div style="font-size:11px;color:#8A93A6;text-transform:uppercase;letter-spacing:0.05em;margin-top:4px;">Open</div>
            </div>
            <div style="background:#1E2A3A;border-radius:4px;padding:20px;text-align:center;">
              <div style="font-family:'Fraunces',serif;font-size:28px;">{{ stats()!.totalManagers }}</div>
              <div style="font-size:11px;color:#8A93A6;text-transform:uppercase;letter-spacing:0.05em;margin-top:4px;">Managers</div>
            </div>
            <div style="background:#1E2A3A;border-radius:4px;padding:20px;text-align:center;">
              <div style="font-family:'Fraunces',serif;font-size:28px;">{{ stats()!.totalAgents }}</div>
              <div style="font-size:11px;color:#8A93A6;text-transform:uppercase;letter-spacing:0.05em;margin-top:4px;">Agents</div>
            </div>
            <div style="background:#1E2A3A;border-radius:4px;padding:20px;text-align:center;">
              <div style="font-family:'Fraunces',serif;font-size:28px;">{{ stats()!.totalCustomers }}</div>
              <div style="font-size:11px;color:#8A93A6;text-transform:uppercase;letter-spacing:0.05em;margin-top:4px;">Customers</div>
            </div>
          </div>
        }

        <!-- Managers -->
        <div style="margin-bottom:48px;">
          <div style="font-family:'Fraunces',serif;font-size:22px;margin-bottom:20px;">Managers Under Command</div>
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px;">
            @for (m of managers(); track m.guid) {
              <div style="background:#1E2A3A;border-radius:4px;padding:20px;border:1px solid #2E3E54;">
                <div style="font-weight:600;font-size:14px;margin-bottom:4px;">{{ m.firstname }} {{ m.lastname }}</div>
                <div style="font-size:12px;color:#8A93A6;margin-bottom:12px;">{{ m.email }}</div>
                <button (click)="reassign(m.guid)"
                        [disabled]="reassignPending() === m.guid"
                        style="background:transparent;border:1px solid #2E3E54;color:#B7BFCC;
                               font-size:12px;padding:6px 14px;border-radius:3px;cursor:pointer;">
                  {{ reassignSuccess() === m.guid ? '✓ Confirmed' : reassignPending() === m.guid ? 'Confirming…' : 'Confirm Under Command' }}
                </button>
              </div>
            }
          </div>
        </div>

        <!-- Agents overview -->
        <div>
          <div style="font-family:'Fraunces',serif;font-size:22px;margin-bottom:20px;">All Field Agents</div>
          <div style="background:#1E2A3A;border-radius:4px;overflow:hidden;border:1px solid #2E3E54;">
            <table style="width:100%;border-collapse:collapse;">
              <thead>
                <tr style="border-bottom:1px solid #2E3E54;">
                  <th style="text-align:left;padding:14px 20px;font-size:11px;color:#8A93A6;text-transform:uppercase;letter-spacing:0.06em;font-weight:500;">Name</th>
                  <th style="text-align:left;padding:14px 20px;font-size:11px;color:#8A93A6;text-transform:uppercase;letter-spacing:0.06em;font-weight:500;">Type</th>
                  <th style="text-align:left;padding:14px 20px;font-size:11px;color:#8A93A6;text-transform:uppercase;letter-spacing:0.06em;font-weight:500;">Epoch</th>
                  <th style="text-align:right;padding:14px 20px;font-size:11px;color:#8A93A6;text-transform:uppercase;letter-spacing:0.06em;font-weight:500;">Trips</th>
                </tr>
              </thead>
              <tbody>
                @for (a of agents(); track a.guid) {
                  <tr style="border-bottom:1px solid #1A2436;">
                    <td style="padding:14px 20px;font-size:13.5px;">{{ a.firstname }} {{ a.lastname }}</td>
                    <td style="padding:14px 20px;">
                      <span style="font-size:11px;padding:2px 8px;border-radius:20px;"
                            [style.background]="a.agentType === 'LicensedAgent' ? 'rgba(201,168,76,0.12)' : 'rgba(91,141,201,0.12)'"
                            [style.color]="a.agentType === 'LicensedAgent' ? '#C9A84C' : '#5B8DC9'">
                        {{ a.agentType === 'LicensedAgent' ? 'Licensed' : 'Support' }}
                      </span>
                    </td>
                    <td style="padding:14px 20px;font-size:12px;color:#8A93A6;">{{ a.specialisationEpochId?.name ?? '—' }}</td>
                    <td style="padding:14px 20px;font-size:13.5px;text-align:right;">{{ a.trips.length }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }
    </div>

    @if (showCreateManager()) {
      <app-create-manager-modal
        (created)="onManagerCreated()"
        (cancelled)="showCreateManager.set(false)" />
    }
  `,
})
export class DirectorDashboardComponent implements OnInit {
  private readonly directorService = inject(DirectorService);
  protected readonly state = inject(AppStateService);

  readonly loading = signal(true);
  readonly loadError = signal('');
  readonly showCreateManager = signal(false);
  readonly reassignPending = signal<string | null>(null);
  readonly reassignSuccess = signal<string | null>(null);
  readonly stats = signal<SystemStatsDto | null>(null);
  readonly managers = signal<ManagerWithIdDto[]>([]);
  readonly agents = signal<AgentDto[]>([]);

  ngOnInit(): void {
    const guid = this.state.currentDirector()?.guid;
    if (!guid) { this.loading.set(false); return; }

    forkJoin({
      stats: this.directorService.getStats(guid),
      managers: this.directorService.getManagers(guid),
      agents: this.directorService.getAgents(guid),
    }).subscribe({
      next: ({ stats, managers, agents }) => {
        this.stats.set(stats);
        this.managers.set(managers);
        this.agents.set(agents);
        this.loading.set(false);
      },
      error: () => {
        this.loadError.set('Could not load director data — is the backend running?');
        this.loading.set(false);
      },
    });
  }

  onManagerCreated(): void {
    this.showCreateManager.set(false);
    this.ngOnInit();
  }

  reassign(managerGuid: string): void {
    const directorGuid = this.state.currentDirector()?.guid;
    if (!directorGuid) return;
    this.reassignPending.set(managerGuid);
    this.directorService.reassignManager(directorGuid, managerGuid).subscribe({
      next: () => {
        this.reassignPending.set(null);
        this.reassignSuccess.set(managerGuid);
        setTimeout(() => this.reassignSuccess.set(null), 2000);
      },
      error: () => this.reassignPending.set(null),
    });
  }
}
