import { ChangeDetectionStrategy, Component, inject, output, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AgentService } from '../../../core/services/agent.service';
import { toErrorMessage } from '../../../core/http/error-message';
import { AppStateService } from '../../../state/app-state.service';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { FormFieldComponent } from '../../../shared/components/form-field/form-field.component';
import { AddressFieldsComponent, createAddressForm, toAddressDto } from '../../../shared/forms/address-form';
import { minAge } from '../../../shared/forms/validators';

/** Recruits a new (support) agent into the signed-in manager's team. */
@Component({
  selector: 'app-create-agent-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, ModalComponent, FormFieldComponent, AddressFieldsComponent],
  template: `
    <app-modal title="Recruit Agent" subtitle="New recruits join your team as support agents." [width]="520" (closed)="closed.emit()">
      <form id="agent-form" class="form-grid" [formGroup]="form" (ngSubmit)="submit()">
        <app-form-field label="First name" [control]="form.controls.firstname" for="agent-first">
          <input class="input" id="agent-first" formControlName="firstname" />
        </app-form-field>
        <app-form-field label="Last name" [control]="form.controls.lastname" for="agent-last">
          <input class="input" id="agent-last" formControlName="lastname" />
        </app-form-field>
        <app-form-field label="Date of birth" [control]="form.controls.dateOfBirth" for="agent-dob">
          <input class="input" id="agent-dob" type="date" formControlName="dateOfBirth" />
        </app-form-field>
        <app-form-field label="Specialisation year" [control]="form.controls.specialisationTime" for="agent-year"
                        hint="Must fall within a known epoch, e.g. 1865 or -44.">
          <input class="input" id="agent-year" type="number" formControlName="specialisationTime" />
        </app-form-field>
        <app-address-fields [group]="form.controls.address" idPrefix="agent-" />
      </form>

      @if (error()) { <p class="form-error">{{ error() }}</p> }

      <div modal-actions>
        <button type="button" class="btn" (click)="closed.emit()">Cancel</button>
        <button type="submit" form="agent-form" class="btn btn--primary" [disabled]="submitting()">
          {{ submitting() ? 'Recruiting…' : 'Recruit agent' }}
        </button>
      </div>
    </app-modal>
  `,
})
export class CreateAgentModalComponent {
  readonly created = output<void>();
  readonly closed = output<void>();

  private readonly api = inject(AgentService);
  private readonly state = inject(AppStateService);

  protected readonly submitting = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly form = new FormGroup({
    firstname: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    lastname: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    dateOfBirth: new FormControl('', { nonNullable: true, validators: [Validators.required, minAge(18)] }),
    specialisationTime: new FormControl<number | null>(null, [Validators.required]),
    address: createAddressForm(),
  });

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { firstname, lastname, dateOfBirth, specialisationTime } = this.form.getRawValue();
    this.submitting.set(true);
    this.error.set(null);

    this.api.create({
      firstname: firstname.trim(),
      lastname: lastname.trim(),
      dateOfBirth,
      specialisationTime: specialisationTime ?? 0,
      managerId: this.state.currentManager()?.id ?? null,
      address: toAddressDto(this.form.controls.address),
    }).subscribe({
      next: () => this.created.emit(),
      error: err => {
        this.submitting.set(false);
        this.error.set(toErrorMessage(err, 'Recruiting failed. Check that the specialisation year lies within a known epoch.'));
      },
    });
  }
}
