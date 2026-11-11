import { ChangeDetectionStrategy, Component, inject, output, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CustomerService } from '../../../core/services/customer.service';
import { toErrorMessage } from '../../../core/http/error-message';
import { AppStateService } from '../../../state/app-state.service';
import { AgencyStore } from '../../../state/agency.store';
import { NotificationService } from '../../../state/notification.service';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { FormFieldComponent } from '../../../shared/components/form-field/form-field.component';
import { AddressFieldsComponent, createAddressForm, toAddressDto } from '../../../shared/forms/address-form';
import { minAge, PHONE_HINT, PHONE_PATTERN } from '../../../shared/forms/validators';

@Component({
  selector: 'app-join-traveller-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, ModalComponent, FormFieldComponent, AddressFieldsComponent],
  template: `
    <app-modal title="Join as Traveller" subtitle="Secure your passage through history." [width]="520" (closed)="closed.emit()">
      <form id="join-form" class="form-grid" [formGroup]="form" (ngSubmit)="submit()">
        <app-form-field label="First name" [control]="form.controls.firstname" for="join-first">
          <input class="input" id="join-first" formControlName="firstname" autocomplete="given-name" />
        </app-form-field>
        <app-form-field label="Last name" [control]="form.controls.lastname" for="join-last">
          <input class="input" id="join-last" formControlName="lastname" autocomplete="family-name" />
        </app-form-field>
        <app-form-field class="span-2" label="Email" [control]="form.controls.email" for="join-email">
          <input class="input" id="join-email" type="email" formControlName="email" autocomplete="email" />
        </app-form-field>
        <app-form-field label="Phone" [control]="form.controls.phoneNumber" for="join-phone"
                        [hint]="phoneHint" [patternMessage]="phoneHint">
          <input class="input" id="join-phone" type="tel" formControlName="phoneNumber" autocomplete="tel" />
        </app-form-field>
        <app-form-field label="Date of birth" [control]="form.controls.dateOfBirth" for="join-dob">
          <input class="input" id="join-dob" type="date" formControlName="dateOfBirth" autocomplete="bday" />
        </app-form-field>
        <app-address-fields [group]="form.controls.address" idPrefix="join-" />
      </form>

      @if (error()) { <p class="form-error">{{ error() }}</p> }

      <div modal-actions>
        <button type="button" class="btn" (click)="closed.emit()">Cancel</button>
        <button type="submit" form="join-form" class="btn btn--primary" [disabled]="submitting()">
          {{ submitting() ? 'Registering…' : 'Claim my passage' }}
        </button>
      </div>
    </app-modal>
  `,
})
export class JoinTravellerModalComponent {
  readonly closed = output<void>();

  private readonly api = inject(CustomerService);
  private readonly state = inject(AppStateService);
  private readonly agency = inject(AgencyStore);
  private readonly notifications = inject(NotificationService);

  protected readonly phoneHint = PHONE_HINT;
  protected readonly submitting = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly form = new FormGroup({
    firstname: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(100)] }),
    lastname: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(100)] }),
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    phoneNumber: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.pattern(PHONE_PATTERN)] }),
    dateOfBirth: new FormControl('', { nonNullable: true, validators: [Validators.required, minAge(18)] }),
    address: createAddressForm(),
  });

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { address, ...person } = this.form.getRawValue();
    this.submitting.set(true);
    this.error.set(null);

    this.api.create({ ...person, address: toAddressDto(this.form.controls.address) }).subscribe({
      next: customer => {
        this.state.signInAsCustomer(customer);
        this.agency.refresh();
        this.notifications.success(`Welcome aboard, ${customer.firstname}!`, 'You are now signed in as a traveller.');
        this.closed.emit();
      },
      error: err => {
        this.submitting.set(false);
        this.error.set(toErrorMessage(err, 'Registration failed.'));
      },
    });
  }
}
