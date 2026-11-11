import { ChangeDetectionStrategy, Component, inject, output, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { switchMap } from 'rxjs';
import { ManagerService } from '../../../core/services/manager.service';
import { DirectorService } from '../../../core/services/director.service';
import { toErrorMessage } from '../../../core/http/error-message';
import { AppStateService } from '../../../state/app-state.service';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { FormFieldComponent } from '../../../shared/components/form-field/form-field.component';
import { AddressFieldsComponent, createAddressForm, toAddressDto } from '../../../shared/forms/address-form';

/** Creates a manager and places them directly under the signed-in director's command. */
@Component({
  selector: 'app-create-manager-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, ModalComponent, FormFieldComponent, AddressFieldsComponent],
  template: `
    <app-modal title="Appoint Manager" [width]="520" (closed)="closed.emit()">
      <form id="manager-form" class="form-grid" [formGroup]="form" (ngSubmit)="submit()">
        <app-form-field label="First name" [control]="form.controls.firstname" for="mgr-first">
          <input class="input" id="mgr-first" formControlName="firstname" />
        </app-form-field>
        <app-form-field label="Last name" [control]="form.controls.lastname" for="mgr-last">
          <input class="input" id="mgr-last" formControlName="lastname" />
        </app-form-field>
        <app-form-field label="Email" [control]="form.controls.email" for="mgr-email">
          <input class="input" id="mgr-email" type="email" formControlName="email" />
        </app-form-field>
        <app-form-field label="Phone" [control]="form.controls.phoneNumber" for="mgr-phone">
          <input class="input" id="mgr-phone" type="tel" formControlName="phoneNumber" />
        </app-form-field>
        <app-address-fields [group]="form.controls.address" idPrefix="mgr-" />
      </form>

      @if (error()) { <p class="form-error">{{ error() }}</p> }

      <div modal-actions>
        <button type="button" class="btn" (click)="closed.emit()">Cancel</button>
        <button type="submit" form="manager-form" class="btn btn--primary" [disabled]="submitting()">
          {{ submitting() ? 'Appointing…' : 'Appoint manager' }}
        </button>
      </div>
    </app-modal>
  `,
})
export class CreateManagerModalComponent {
  readonly created = output<void>();
  readonly closed = output<void>();

  private readonly managers = inject(ManagerService);
  private readonly directors = inject(DirectorService);
  private readonly state = inject(AppStateService);

  protected readonly submitting = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly form = new FormGroup({
    firstname: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    lastname: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    phoneNumber: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    address: createAddressForm(),
  });

  protected submit(): void {
    const director = this.state.currentDirector();
    if (this.form.invalid || !director) {
      this.form.markAllAsTouched();
      return;
    }
    const { address, ...person } = this.form.getRawValue();
    this.submitting.set(true);
    this.error.set(null);

    this.managers.create({ ...person, address: toAddressDto(this.form.controls.address) })
      .pipe(switchMap(manager => this.directors.assignManager(director.guid, manager.guid)))
      .subscribe({
        next: () => this.created.emit(),
        error: err => {
          this.submitting.set(false);
          this.error.set(toErrorMessage(err, 'Failed to appoint manager.'));
        },
      });
  }
}
