import { ChangeDetectionStrategy, Component, computed, inject, output, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ManagerService } from '../../../core/services/manager.service';
import { toErrorMessage } from '../../../core/http/error-message';
import { AppStateService } from '../../../state/app-state.service';
import { AgencyStore } from '../../../state/agency.store';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { FormFieldComponent } from '../../../shared/components/form-field/form-field.component';
import { futureDate } from '../../../shared/forms/validators';
import { epochLabel, fullName } from '../../../shared/utils/status.utils';

@Component({
  selector: 'app-create-trip-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, ModalComponent, FormFieldComponent],
  template: `
    <app-modal title="Create Trip" subtitle="A licensed agent is required to lead every excursion." (closed)="closed.emit()">
      <form id="trip-form" class="stack" [formGroup]="form" (ngSubmit)="submit()">
        <app-form-field label="Trip name" [control]="form.controls.tripName" for="trip-name" hint="Optional">
          <input class="input" id="trip-name" formControlName="tripName" placeholder="e.g. Belle Époque Paris" />
        </app-form-field>
        <app-form-field label="Departure" [control]="form.controls.dateInRealLife" for="trip-date">
          <input class="input" id="trip-date" type="datetime-local" formControlName="dateInRealLife" />
        </app-form-field>
        <app-form-field label="Licensed agent" [control]="form.controls.licensedAgentGuid" for="trip-agent"
                        hint="The agent's specialisation epoch determines the destination era.">
          <select class="select" id="trip-agent" formControlName="licensedAgentGuid">
            <option value="">Select a licensed agent…</option>
            @for (a of licensedAgents(); track a.guid) {
              <option [value]="a.guid">{{ a.name }}{{ a.epoch ? ' — ' + a.epoch : '' }}</option>
            }
          </select>
        </app-form-field>
      </form>

      @if (error()) { <p class="form-error">{{ error() }}</p> }

      <div modal-actions>
        <button type="button" class="btn" (click)="closed.emit()">Cancel</button>
        <button type="submit" form="trip-form" class="btn btn--primary" [disabled]="submitting()">
          {{ submitting() ? 'Creating…' : 'Create trip' }}
        </button>
      </div>
    </app-modal>
  `,
})
export class CreateTripModalComponent {
  readonly created = output<void>();
  readonly closed = output<void>();

  private readonly api = inject(ManagerService);
  private readonly state = inject(AppStateService);
  private readonly agency = inject(AgencyStore);

  protected readonly submitting = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly licensedAgents = computed(() =>
    this.agency.agents()
      .filter(a => a.agentType === 'LicensedAgent')
      .map(a => ({ guid: a.guid, name: fullName(a), epoch: epochLabel(a.specialisationEpochId, false) })),
  );

  protected readonly form = new FormGroup({
    tripName: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(255)] }),
    dateInRealLife: new FormControl('', { nonNullable: true, validators: [Validators.required, futureDate()] }),
    licensedAgentGuid: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  protected submit(): void {
    const manager = this.state.currentManager();
    if (this.form.invalid || !manager) {
      this.form.markAllAsTouched();
      return;
    }
    const { tripName, dateInRealLife, licensedAgentGuid } = this.form.getRawValue();
    this.submitting.set(true);
    this.error.set(null);

    this.api.createTrip(manager.guid, {
      tripName: tripName.trim() || null,
      dateInRealLife: new Date(dateInRealLife).toISOString(),
      licensedAgentGuid,
    }).subscribe({
      next: () => this.created.emit(),
      error: err => {
        this.submitting.set(false);
        this.error.set(toErrorMessage(err, 'Failed to create trip.'));
      },
    });
  }
}
