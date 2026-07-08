import { Component, Input, Output, EventEmitter, OnInit, inject, signal, HostListener } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AgentService } from '../../../core/services/agent.service';
import { ManagerService } from '../../../core/services/manager.service';
import { AgentDto } from '../../../core/models/agent.model';
import { AppStateService } from '../../../state/app-state.service';
import { agentFullName } from '../../../shared/utils/status.utils';

@Component({
  selector: 'app-assign-agent-modal',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div (click)="onBackdropClick($event)"
         style="position:fixed;inset:0;background:rgba(5,7,12,0.75);display:flex;
                align-items:center;justify-content:center;z-index:50;">
      <div (click)="$event.stopPropagation()" style="background:#1E2A3A;border-radius:6px;padding:36px 40px;width:400px;
                  box-shadow:0 30px 80px rgba(0,0,0,0.5);">
        <div style="font-family:'Fraunces',serif;font-size:20px;margin-bottom:6px;">
          Reassign Licensed Agent
        </div>
        <div style="font-size:13px;color:#C9A84C;margin-bottom:24px;">{{ tripName }}</div>

        <select [(ngModel)]="selectedAgentGuid"
                style="width:100%;background:#0B1120;border:1px solid #2E3E54;color:#F0EDE6;
                       padding:11px 14px;border-radius:3px;font-size:13.5px;margin-bottom:28px;">
          <option value="">Select an agent…</option>
          @for (agent of agents(); track agent.guid) {
            <option [value]="agent.guid">{{ fullName(agent) }}</option>
          }
        </select>

        @if (errorMsg()) {
          <div style="color:#E05A4E;font-size:12px;margin-bottom:16px;">{{ errorMsg() }}</div>
        }

        <div style="display:flex;justify-content:flex-end;gap:12px;">
          <button (click)="cancelled.emit()"
                  style="background:transparent;border:1px solid #2E3E54;color:#B7BFCC;
                         font-size:13.5px;padding:10px 20px;border-radius:3px;cursor:pointer;">
            Cancel
          </button>
          <button (click)="submit()" [disabled]="submitting()"
                  style="background:#C9A84C;border:none;color:#0B1120;font-weight:600;
                         font-size:13.5px;padding:10px 22px;border-radius:3px;cursor:pointer;">
            {{ submitting() ? 'Saving…' : 'Save' }}
          </button>
        </div>
      </div>
    </div>
  `,
})
export class AssignAgentModalComponent implements OnInit {
  @Input({ required: true }) tripGuid!: string;
  @Input() tripName = '';
  @Output() assigned = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  private readonly agentService = inject(AgentService);
  private readonly managerService = inject(ManagerService);
  private readonly state = inject(AppStateService);

  readonly agents = signal<AgentDto[]>([]);
  readonly submitting = signal(false);
  readonly errorMsg = signal('');

  selectedAgentGuid = '';

  @HostListener('document:keydown.escape')
  onEscape(): void { this.cancelled.emit(); }

  onBackdropClick(e: MouseEvent): void {
    if (e.target === e.currentTarget) this.cancelled.emit();
  }

  ngOnInit(): void {
    this.agentService.getAll().subscribe(a => this.agents.set(a));
  }

  fullName(agent: AgentDto): string {
    return agentFullName(agent);
  }

  submit(): void {
    if (!this.selectedAgentGuid) {
      this.errorMsg.set('Please select an agent.');
      return;
    }
    const managerGuid = this.state.currentManager()?.guid;
    if (!managerGuid) {
      this.errorMsg.set('No manager selected.');
      return;
    }

    this.submitting.set(true);
    this.errorMsg.set('');
    this.managerService.assignAgent(managerGuid, this.selectedAgentGuid, this.tripGuid).subscribe({
      next: () => {
        this.submitting.set(false);
        this.assigned.emit();
      },
      error: (err) => {
        this.submitting.set(false);
        this.errorMsg.set(err?.error ?? 'Assignment failed.');
      },
    });
  }
}
