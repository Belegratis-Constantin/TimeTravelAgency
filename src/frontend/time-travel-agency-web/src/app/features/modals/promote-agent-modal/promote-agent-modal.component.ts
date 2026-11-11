import { ChangeDetectionStrategy, Component, computed, inject, output, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ManagerService } from '../../../core/services/manager.service';
import { toErrorMessage } from '../../../core/http/error-message';
import { AppStateService } from '../../../state/app-state.service';
import { AgencyStore } from '../../../state/agency.store';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { FormFieldComponent } from '../../../shared/components/form-field/form-field.component';
import { futureDate } from '../../../shared/forms/validators';
import { fullName } from '../../../shared/utils/status.utils';

/** Grants one of the manager's support agents a licence. */
@Component({
  selector: 'app-promote-agent-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, ModalComponent, FormFieldComponent],
  template: `
    <app-modal title="Grant Licence" subtitle="Licensed agents may lead trips." (closed)="closed.emit()">
      @if (candidates().length === 0) {
        <p class="empty-hint">All agents in your team are already licensed.</p>
      } @else {
        <form id="promote-form" class="form-grid" [formGroup]="form" (ngSubmit)="submit()">
          <app-form-field class="span-2" label="Agent" [control]="form.controls.agentGuid" for="promote-agent">
            <select class="select" id="promote-agent" formControlName="agentGuid">
              <option value="">Select a support agent…</option>
              @for (a of candidates(); track a.guid) {
                <option [value]="a.guid">{{ a.name }} ({{ a.year }})</option>
              }
            </select>
          </app-form-field>
          <app-form-field label="Licence number" [control]="form.controls.licenseNumber" for="promote-number">
            <input class="input" id="promote-number" type="number" formControlName="licenseNumber" />
          </app-form-field>
          <app-form-field label="Expires" [control]="form.controls.licenseExpirationDate" for="promote-expiry">
            <input class="input" id="promote-expiry" type="date" formControlName="licenseExpirationDate" />
          </app-form-field>
        </form>
      }

      @if (error()) { <p class="form-error">{{ error() }}</p> }

      <div modal-actions>
        <button type="button" class="btn" (click)="closed.emit()">Cancel</button>
        <button type="submit" form="promote-form" class="btn btn--primary" [disabled]="submitting() || candidates().length === 0">
          {{ submitting() ? 'Granting…' : 'Grant licence' }}
        </button>
      </div>
    </app-modal>
  `,
})
export class PromoteAgentModalComponent {
  readonly promoted = output<void>();
  readonly closed = output<void>();

  private readonly api = inject(ManagerService);
  private readonly state = inject(AppStateService);
  private readonly agency = inject(AgencyStore);

  protected readonly submitting = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly candidates = computed(() => {
    const managerId = this.state.currentManager()?.id;
    return this.agency.agents()
      .filter(a => a.agentType === 'Agent' && a.managerId === managerId)
      .map(a => ({ guid: a.guid, name: fullName(a), year: a.specialisationTime }));
  });

  protected readonly form = new FormGroup({
    agentGuid: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    licenseNumber: new FormControl<number | null>(null, [Validators.required, Validators.min(0)]),
    licenseExpirationDate: new FormControl('', { nonNullable: true, validators: [Validators.required, futureDate()] }),
  });

  protected submit(): void {
    const manager = this.state.currentManager();
    if (this.form.invalid || !manager) {
      this.form.markAllAsTouched();
      return;
    }
    const { agentGuid, licenseNumber, licenseExpirationDate } = this.form.getRawValue();
    this.submitting.set(true);
    this.error.set(null);

    this.api.makeAgentLicensed(manager.guid, agentGuid, {
      licenseNumber: licenseNumber ?? 0,
      licenseExpirationDate,
    }).subscribe({
      next: () => this.promoted.emit(),
      error: err => {
        this.submitting.set(false);
        this.error.set(toErrorMessage(err, 'Promotion failed.'));
      },
    });
  }
}
