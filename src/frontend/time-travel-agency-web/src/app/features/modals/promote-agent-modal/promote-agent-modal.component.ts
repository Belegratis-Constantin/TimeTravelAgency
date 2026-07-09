import { Component, Output, EventEmitter, inject, signal, HostListener, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AgentService } from '../../../core/services/agent.service';
import { ManagerService } from '../../../core/services/manager.service';
import { AppStateService } from '../../../state/app-state.service';
import { AgentDto } from '../../../core/models/agent.model';

@Component({
  selector: 'app-promote-agent-modal',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div (click)="onBackdropClick($event)"
         style="position:fixed;inset:0;background:rgba(5,7,12,0.75);display:flex;
                align-items:center;justify-content:center;z-index:50;">
      <div (click)="$event.stopPropagation()"
           style="background:#1E2A3A;border-radius:6px;padding:36px 40px;width:480px;
                  box-shadow:0 30px 80px rgba(0,0,0,0.5);max-height:90vh;overflow-y:auto;">
        <div style="font-family:'Fraunces',serif;font-size:22px;margin-bottom:6px;">Promote Agent</div>
        <div style="font-size:12px;color:#6B7488;margin-bottom:24px;">
          Grant a field agent their Licensed Agent certification.
        </div>

        @if (loadingAgents()) {
          <div style="color:#6B7488;padding:20px 0;">Loading agents…</div>
        } @else {
          <div style="margin-bottom:20px;">
            <div style="font-size:11px;color:#8A93A6;margin-bottom:5px;letter-spacing:0.07em;text-transform:uppercase;">
              Select Agent *
            </div>
            <select [(ngModel)]="selectedAgentGuid"
                    style="width:100%;background:#0B1120;border:1px solid #2E3E54;color:#F0EDE6;
                           padding:10px 13px;border-radius:3px;font-size:13.5px;">
              <option value="">— Pick an agent —</option>
              @for (a of plainAgents(); track a.guid) {
                <option [value]="a.guid">{{ a.firstname }} {{ a.lastname }} ({{ a.specialisationTime }})</option>
              }
            </select>
            @if (fieldErrors['agent']) {
              <div style="color:#E05A4E;font-size:11px;margin-top:4px;">{{ fieldErrors['agent'] }}</div>
            }
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:24px;">
            <div>
              <div style="font-size:11px;color:#8A93A6;margin-bottom:5px;letter-spacing:0.07em;text-transform:uppercase;">License Number *</div>
              <input type="number" [(ngModel)]="licenseNumber" placeholder="e.g. 10042"
                     style="width:100%;background:#0B1120;border:1px solid #2E3E54;color:#F0EDE6;
                            padding:10px 13px;border-radius:3px;font-size:13.5px;box-sizing:border-box;" />
              @if (fieldErrors['licenseNumber']) {
                <div style="color:#E05A4E;font-size:11px;margin-top:4px;">{{ fieldErrors['licenseNumber'] }}</div>
              }
            </div>
            <div>
              <div style="font-size:11px;color:#8A93A6;margin-bottom:5px;letter-spacing:0.07em;text-transform:uppercase;">Expiry Date *</div>
              <input type="date" [(ngModel)]="expiryDate"
                     style="width:100%;background:#0B1120;border:1px solid #2E3E54;color:#F0EDE6;
                            padding:10px 13px;border-radius:3px;font-size:13.5px;box-sizing:border-box;" />
              @if (fieldErrors['expiryDate']) {
                <div style="color:#E05A4E;font-size:11px;margin-top:4px;">{{ fieldErrors['expiryDate'] }}</div>
              }
            </div>
          </div>
        }

        @if (errorMsg()) {
          <div style="color:#E05A4E;font-size:12px;margin-bottom:14px;padding:10px;background:rgba(224,90,78,0.1);border-radius:3px;">
            {{ errorMsg() }}
          </div>
        }

        <div style="display:flex;justify-content:flex-end;gap:12px;">
          <button (click)="cancelled.emit()"
                  style="background:transparent;border:1px solid #2E3E54;color:#B7BFCC;
                         font-size:13.5px;padding:10px 20px;border-radius:3px;cursor:pointer;">
            Cancel
          </button>
          <button (click)="submit()" [disabled]="submitting() || loadingAgents()"
                  style="background:#C9A84C;border:none;color:#0B1120;font-weight:600;
                         font-size:13.5px;padding:10px 22px;border-radius:3px;cursor:pointer;">
            {{ submitting() ? 'Promoting…' : 'Grant Licence' }}
          </button>
        </div>
      </div>
    </div>
  `,
})
export class PromoteAgentModalComponent implements OnInit {
  @Output() promoted = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  private readonly agentService = inject(AgentService);
  private readonly managerService = inject(ManagerService);
  private readonly state = inject(AppStateService);

  readonly submitting = signal(false);
  readonly loadingAgents = signal(true);
  readonly errorMsg = signal('');
  readonly plainAgents = signal<AgentDto[]>([]);

  selectedAgentGuid = '';
  licenseNumber = '';
  expiryDate = '';
  fieldErrors: Record<string, string> = {};

  @HostListener('document:keydown.escape')
  onEscape(): void { this.cancelled.emit(); }

  onBackdropClick(e: MouseEvent): void {
    if (e.target === e.currentTarget) this.cancelled.emit();
  }

  ngOnInit(): void {
    this.agentService.getAll().subscribe({
      next: agents => {
        this.plainAgents.set(agents.filter(a => a.agentType === 'Agent'));
        this.loadingAgents.set(false);
      },
      error: () => this.loadingAgents.set(false),
    });
  }

  private validate(): boolean {
    this.fieldErrors = {};
    let valid = true;
    if (!this.selectedAgentGuid) { this.fieldErrors['agent'] = 'Select an agent.'; valid = false; }
    if (!this.licenseNumber) { this.fieldErrors['licenseNumber'] = 'License number required.'; valid = false; }
    if (!this.expiryDate) { this.fieldErrors['expiryDate'] = 'Expiry date required.'; valid = false; }
    return valid;
  }

  submit(): void {
    if (!this.validate()) return;
    const managerGuid = this.state.currentManager()?.guid;
    if (!managerGuid) { this.errorMsg.set('No manager session found.'); return; }

    this.submitting.set(true);
    this.errorMsg.set('');

    this.managerService.makeAgentLicensed(managerGuid, this.selectedAgentGuid, {
      licenseNumber: parseInt(this.licenseNumber, 10),
      licenseExpirationDate: this.expiryDate,
    }).subscribe({
      next: () => { this.submitting.set(false); this.promoted.emit(); },
      error: err => {
        this.submitting.set(false);
        this.errorMsg.set(err?.error ?? 'Promotion failed.');
      },
    });
  }
}
