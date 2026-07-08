import { Component, OnInit, inject, signal, HostListener } from '@angular/core';
import { CustomerService } from '../../../core/services/customer.service';
import { ManagerService } from '../../../core/services/manager.service';
import { AgentService } from '../../../core/services/agent.service';
import { CustomerDto } from '../../../core/models/trip.model';
import { ManagerWithIdDto } from '../../../core/models/manager.model';
import { AgentDto } from '../../../core/models/agent.model';
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
          @if (pendingRole === 'agent') { Sign in as Licensed Agent }
          @if (pendingRole === 'manager') { Sign in as Manager }
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
                <div style="font-weight:600;">{{ a.firstname }} {{ a.lastname }}</div>
                <div style="font-size:12px;color:#8A93A6;margin-top:2px;">{{ a.agentType }}</div>
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
  protected readonly state = inject(AppStateService);

  readonly customers = signal<CustomerDto[]>([]);
  readonly managers = signal<ManagerWithIdDto[]>([]);
  readonly agents = signal<AgentDto[]>([]);
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
        next: list => { this.agents.set(list.filter(a => a.agentType === 'LicensedAgent')); this.loading.set(false); },
        error: () => { this.loading.set(false); this.error.set(true); },
      });
    } else if (this.pendingRole === 'manager') {
      this.managerService.getAllWithId().subscribe({
        next: list => { this.managers.set(list); this.loading.set(false); },
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

  cancel(): void {
    this.state.cancelPendingRole();
  }
}
