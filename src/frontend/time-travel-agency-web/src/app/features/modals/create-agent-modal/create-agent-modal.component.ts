import { Component, Output, EventEmitter, inject, signal, HostListener } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AgentService } from '../../../core/services/agent.service';

@Component({
  selector: 'app-create-agent-modal',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div (click)="onBackdropClick($event)"
         style="position:fixed;inset:0;background:rgba(5,7,12,0.75);display:flex;
                align-items:center;justify-content:center;z-index:50;">
      <div (click)="$event.stopPropagation()"
           style="background:#1E2A3A;border-radius:6px;padding:36px 40px;width:460px;
                  box-shadow:0 30px 80px rgba(0,0,0,0.5);max-height:90vh;overflow-y:auto;">
        <div style="font-family:'Fraunces',serif;font-size:22px;margin-bottom:6px;">Add Agent</div>
        <div style="font-size:12px;color:#6B7488;margin-bottom:24px;">
          Specialisation year must fall within a known historical epoch.
        </div>

        <div style="display:flex;flex-direction:column;gap:14px;margin-bottom:24px;">
          @for (field of fields; track field.key) {
            <div>
              <div style="font-size:11px;color:#8A93A6;margin-bottom:5px;letter-spacing:0.07em;text-transform:uppercase;">
                {{ field.label }}{{ field.required ? ' *' : '' }}
              </div>
              <input [type]="field.type || 'text'" [(ngModel)]="values[field.key]"
                     [placeholder]="field.placeholder"
                     style="width:100%;background:#0B1120;border:1px solid #2E3E54;color:#F0EDE6;
                            padding:10px 13px;border-radius:3px;font-size:13.5px;box-sizing:border-box;" />
              @if (fieldErrors[field.key]) {
                <div style="color:#E05A4E;font-size:11px;margin-top:4px;">{{ fieldErrors[field.key] }}</div>
              }
            </div>
          }
        </div>

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
          <button (click)="submit()" [disabled]="submitting()"
                  style="background:#C9A84C;border:none;color:#0B1120;font-weight:600;
                         font-size:13.5px;padding:10px 22px;border-radius:3px;cursor:pointer;">
            {{ submitting() ? 'Recruiting…' : 'Recruit Agent' }}
          </button>
        </div>
      </div>
    </div>
  `,
})
export class CreateAgentModalComponent {
  @Output() created = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  private readonly agentService = inject(AgentService);
  readonly submitting = signal(false);
  readonly errorMsg = signal('');

  fields = [
    { key: 'firstname', label: 'First Name', placeholder: 'e.g. Harriet', required: true },
    { key: 'lastname', label: 'Last Name', placeholder: 'e.g. Tubman', required: true },
    { key: 'dateOfBirth', label: 'Date of Birth', placeholder: '', required: true, type: 'date' },
    { key: 'specialisationTime', label: 'Specialisation Year', placeholder: 'e.g. 1865 or -44', required: true, type: 'number' },
    { key: 'street', label: 'Street', placeholder: '10 Downing Street', required: true },
    { key: 'city', label: 'City', placeholder: 'London', required: true },
    { key: 'zipCode', label: 'ZIP Code', placeholder: '10001', required: true, type: 'number' },
  ];

  values: Record<string, string> = {};
  fieldErrors: Record<string, string> = {};

  @HostListener('document:keydown.escape')
  onEscape(): void { this.cancelled.emit(); }

  onBackdropClick(e: MouseEvent): void {
    if (e.target === e.currentTarget) this.cancelled.emit();
  }

  private validate(): boolean {
    this.fieldErrors = {};
    let valid = true;
    for (const f of this.fields) {
      if (f.required && !this.values[f.key]?.toString().trim()) {
        this.fieldErrors[f.key] = `${f.label} is required.`;
        valid = false;
      }
    }
    const dob = new Date(this.values['dateOfBirth']);
    const age = (Date.now() - dob.getTime()) / (365.25 * 24 * 3600 * 1000);
    if (this.values['dateOfBirth'] && age < 18) {
      this.fieldErrors['dateOfBirth'] = 'Agent must be at least 18 years old.';
      valid = false;
    }
    return valid;
  }

  submit(): void {
    if (!this.validate()) return;
    this.submitting.set(true);
    this.errorMsg.set('');

    this.agentService.create({
      firstname: this.values['firstname'],
      lastname: this.values['lastname'],
      dateOfBirth: this.values['dateOfBirth'],
      specialisationTime: parseInt(this.values['specialisationTime'], 10),
      address: {
        street: this.values['street'],
        city: this.values['city'],
        zipCode: parseInt(this.values['zipCode'], 10),
      },
    }).subscribe({
      next: () => { this.submitting.set(false); this.created.emit(); },
      error: err => {
        this.submitting.set(false);
        this.errorMsg.set(err?.error ?? 'Failed to recruit agent. Check specialisation year falls within a known epoch.');
      },
    });
  }
}
