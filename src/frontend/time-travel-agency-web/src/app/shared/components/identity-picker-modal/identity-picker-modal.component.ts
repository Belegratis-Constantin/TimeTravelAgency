import { Component, OnInit, inject, signal, HostListener } from '@angular/core';
import { CustomerService } from '../../../core/services/customer.service';
import { ManagerService } from '../../../core/services/manager.service';
import { AgentService } from '../../../core/services/agent.service';
import { DirectorService } from '../../../core/services/director.service';
import { CustomerDto } from '../../../core/models/trip.model';
import { ManagerWithIdDto } from '../../../core/models/manager.model';
import { AgentDto } from '../../../core/models/agent.model';
import { DirectorDto } from '../../../core/models/director.model';
import { AppStateService, Role } from '../../../state/app-state.service';

@Component({
  selector: 'app-identity-picker-modal',
  standalone: true,
  template: `
    <div style="position:fixed;inset:0;background:rgba(5,7,12,0.8);display:flex;
                align-items:center;justify-content:center;z-index:50;">
      <div style="background:#1E2A3A;border-radius:6px;padding:36px 40px;width:420px;
                  box-shadow:0 30px 80px rgba(0,0,0,0.5);">
        <div style="font-family:'Fraunces',serif;font-size:22px;margin-bottom:6px;">
          @if (pendingRole === 'customer') { Sign in as Customer }
          @if (pendingRole === 'agent') { Sign in as Agent }
          @if (pendingRole === 'manager') { Sign in as Manager }
          @if (pendingRole === 'director') { Sign in as Director }
        </div>
        <div style="font-size:13px;color:#8A93A6;margin-bottom:24px;">
          Select your identity from the database.
        </div>

        @if (loading()) {
          <div style="color:#8A93A6;font-size:13px;padding:20px 0;">Loading…</div>
        }

        @if (error()) {
          <div style="color:#E05A4E;font-size:13px;padding:20px 0;">
            Failed to load — is the backend running?
          </div>
        }

        @if (!loading() && !error() && pendingRole === 'customer') {
          <div style="display:flex;flex-direction:column;gap:10px;max-height:320px;overflow-y:auto;margin-bottom:24px;">
            @for (c of customers(); track c.guid) {
              <div (click)="selectCustomer(c)"
                   style="padding:14px 16px;background:#0B1120;border-radius:3px;
                          cursor:pointer;font-size:13.5px;border:1px solid;"
                   [style.borderColor]="selected() === c.guid ? '#C9A84C' : '#2E3E54'">
                <div style="font-weight:600;">{{ c.firstname }} {{ c.lastname }}</div>
                <div style="font-size:12px;color:#8A93A6;margin-top:2px;">{{ c.email }}</div>
              </div>
            }
          </div>
        }

        @if (!loading() && !error() && pendingRole === 'agent') {
          <div style="display:flex;flex-direction:column;gap:10px;max-height:320px;overflow-y:auto;margin-bottom:24px;">
            @for (a of agents(); track a.guid) {
              <div (click)="selectAgent(a)"
                   style="padding:14px 16px;background:#0B1120;border-radius:3px;
                          cursor:pointer;font-size:13.5px;border:1px solid;"
                   [style.borderColor]="selected() === a.guid ? '#C9A84C' : '#2E3E54'">
                <div style="display:flex;justify-content:space-between;align-items:center;">
                  <div style="font-weight:600;">{{ a.firstname }} {{ a.lastname }}</div>
                  <span style="font-size:10px;color:#C9A84C;background:rgba(201,168,76,0.12);
                               border:1px solid rgba(201,168,76,0.3);padding:2px 7px;border-radius:20px;">
                    {{ a.agentType === 'LicensedAgent' ? 'Licensed' : 'Support' }}
                  </span>
                </div>
                @if (a.specialisationEpochId) {
                  <div style="font-size:11.5px;color:#6B7488;margin-top:4px;">
                    {{ a.specialisationEpochId.name }}
                    ({{ a.specialisationEpochId.startYear > 0 ? a.specialisationEpochId.startYear + ' CE' : (-a.specialisationEpochId.startYear) + ' BCE' }})
                  </div>
                }
              </div>
            }
          </div>
        }

        @if (!loading() && !error() && pendingRole === 'manager') {
          <div style="display:flex;flex-direction:column;gap:10px;max-height:320px;overflow-y:auto;margin-bottom:24px;">
            @for (m of managers(); track m.guid) {
              <div (click)="selectManager(m)"
                   style="padding:14px 16px;background:#0B1120;border-radius:3px;
                          cursor:pointer;font-size:13.5px;border:1px solid;"
                   [style.borderColor]="selected() === m.guid ? '#C9A84C' : '#2E3E54'">
                <div style="font-weight:600;">{{ m.firstname }} {{ m.lastname }}</div>
                <div style="font-size:12px;color:#8A93A6;margin-top:2px;">{{ m.email }}</div>
              </div>
            }
          </div>
        }

        @if (!loading() && !error() && pendingRole === 'director') {
          <div style="display:flex;flex-direction:column;gap:10px;max-height:320px;overflow-y:auto;margin-bottom:24px;">
            @for (d of directors(); track d.guid) {
              <div (click)="selectDirector(d)"
                   style="padding:14px 16px;background:#0B1120;border-radius:3px;
                          cursor:pointer;font-size:13.5px;border:1px solid;"
                   [style.borderColor]="selected() === d.guid ? '#C9A84C' : '#2E3E54'">
                <div style="font-weight:600;">{{ d.name }}</div>
                <div style="font-size:12px;color:#8A93A6;margin-top:2px;">
                  Oversees {{ d.managerCount }} manager{{ d.managerCount !== 1 ? 's' : '' }}
                </div>
              </div>
            }
          </div>
        }

        <div style="display:flex;justify-content:flex-end;">
          <button (click)="cancel()"
                  style="background:transparent;border:1px solid #2E3E54;color:#B7BFCC;
                         font-size:13.5px;padding:10px 20px;border-radius:3px;cursor:pointer;">
            Cancel
          </button>
        </div>
      </div>
    </div>
  `,
})
export class IdentityPickerModalComponent implements OnInit {
  private readonly customerService = inject(CustomerService);
  private readonly managerService = inject(ManagerService);
  private readonly agentService = inject(AgentService);
  private readonly directorService = inject(DirectorService);
  protected readonly state = inject(AppStateService);

  readonly customers = signal<CustomerDto[]>([]);
  readonly managers = signal<ManagerWithIdDto[]>([]);
  readonly agents = signal<AgentDto[]>([]);
  readonly directors = signal<DirectorDto[]>([]);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly selected = signal<string | null>(null);

  get pendingRole(): Role | null {
    return this.state.pendingRole();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void { this.state.cancelPendingRole(); }

  ngOnInit(): void {
    if (this.pendingRole === 'customer') {
      this.customerService.getAll().subscribe({
        next: list => { this.customers.set(list); this.loading.set(false); },
        error: () => { this.loading.set(false); this.error.set(true); },
      });
    } else if (this.pendingRole === 'agent') {
      this.agentService.getAll().subscribe({
        next: list => { this.agents.set(list); this.loading.set(false); },
        error: () => { this.loading.set(false); this.error.set(true); },
      });
    } else if (this.pendingRole === 'manager') {
      this.managerService.getAllWithId().subscribe({
        next: list => { this.managers.set(list); this.loading.set(false); },
        error: () => { this.loading.set(false); this.error.set(true); },
      });
    } else if (this.pendingRole === 'director') {
      this.directorService.get().subscribe({
        next: d => { this.directors.set([d]); this.loading.set(false); },
        error: () => { this.loading.set(false); this.error.set(true); },
      });
    }
  }

  selectCustomer(customer: CustomerDto): void {
    this.selected.set(customer.guid);
    this.state.setCustomer(customer);
  }

  selectAgent(agent: AgentDto): void {
    this.selected.set(agent.guid);
    this.state.setAgent(agent);
  }

  selectManager(manager: ManagerWithIdDto): void {
    this.selected.set(manager.guid);
    this.state.setManager(manager);
  }

  selectDirector(director: DirectorDto): void {
    this.selected.set(director.guid);
    this.state.setDirector(director);
  }

  cancel(): void {
    this.state.cancelPendingRole();
  }
}
