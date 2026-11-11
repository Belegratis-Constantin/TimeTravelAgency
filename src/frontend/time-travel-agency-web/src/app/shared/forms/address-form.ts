import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AddressDto } from '../../core/models/trip.model';
import { FormFieldComponent } from '../components/form-field/form-field.component';

export type AddressForm = FormGroup<{
  street: FormControl<string>;
  city: FormControl<string>;
  zipCode: FormControl<number | null>;
}>;

export function createAddressForm(): AddressForm {
  return new FormGroup({
    street: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(255)] }),
    city: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(50)] }),
    zipCode: new FormControl<number | null>(null, [Validators.required, Validators.min(1), Validators.max(9_999_999_999)]),
  });
}

export function toAddressDto(form: AddressForm): AddressDto {
  const { street, city, zipCode } = form.getRawValue();
  return { street: street.trim(), city: city.trim(), zipCode: zipCode ?? 0 };
}

/** Street / city / ZIP fields shared by the customer, manager and agent registration forms. */
@Component({
  selector: 'app-address-fields',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, FormFieldComponent],
  template: `
    <ng-container [formGroup]="group()">
      <app-form-field class="span-2" label="Street" [control]="group().controls.street" [for]="idPrefix() + 'street'">
        <input class="input" [id]="idPrefix() + 'street'" formControlName="street" autocomplete="street-address" />
      </app-form-field>
      <app-form-field label="City" [control]="group().controls.city" [for]="idPrefix() + 'city'">
        <input class="input" [id]="idPrefix() + 'city'" formControlName="city" autocomplete="address-level2" />
      </app-form-field>
      <app-form-field label="ZIP code" [control]="group().controls.zipCode" [for]="idPrefix() + 'zip'">
        <input class="input" [id]="idPrefix() + 'zip'" type="number" formControlName="zipCode" autocomplete="postal-code" />
      </app-form-field>
    </ng-container>
  `,
  // Renders directly into the parent's .form-grid
  styles: `:host { display: contents; }`,
})
export class AddressFieldsComponent {
  readonly group = input.required<AddressForm>();
  readonly idPrefix = input('addr-');
}
