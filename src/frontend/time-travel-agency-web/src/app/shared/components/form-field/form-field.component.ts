import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, ValidationErrors, Validators } from '@angular/forms';
import { startWith, switchMap } from 'rxjs';

/**
 * Label + validation message wrapper around a projected input.
 * Errors appear once the control was touched (or the form was submitted via markAllAsTouched).
 */
@Component({
  selector: 'app-form-field',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <label class="label" [attr.for]="for()">{{ label() }}@if (required()) {<span aria-hidden="true"> *</span>}</label>
    <ng-content />
    @if (error(); as message) {
      <div class="error" role="alert">{{ message }}</div>
    } @else if (hint()) {
      <div class="hint">{{ hint() }}</div>
    }
  `,
  styles: `
    :host { display: block; }
    .label { display: block; font-size: 12.5px; font-weight: 500; color: var(--text-2); margin-bottom: 5px; }
    .label span { color: var(--red); }
    .error { color: var(--red); font-size: 12px; margin-top: 4px; }
    .hint { color: var(--text-faint); font-size: 12px; margin-top: 4px; }
  `,
})
export class FormFieldComponent {
  readonly label = input.required<string>();
  readonly control = input.required<AbstractControl>();
  /** id of the projected input, for the label's `for` attribute. */
  readonly for = input<string>();
  readonly hint = input<string>();
  /** Overrides the generic message for `pattern` errors. */
  readonly patternMessage = input('Invalid format.');

  // Control state is not signal-based; re-evaluate whenever the control emits an event.
  private readonly controlEvents = toSignal(
    toObservable(this.control).pipe(switchMap(c => c.events.pipe(startWith(null)))),
  );

  protected readonly required = computed(() => {
    this.controlEvents();
    return this.control().hasValidator(Validators.required);
  });

  protected readonly error = computed(() => {
    this.controlEvents();
    const c = this.control();
    return c.touched && c.errors ? this.message(c.errors) : null;
  });

  private message(errors: ValidationErrors): string {
    if (errors['required']) return `${this.label()} is required.`;
    if (errors['email']) return 'Please enter a valid email address.';
    if (errors['pattern']) return this.patternMessage();
    if (errors['minAge']) return `Must be at least ${errors['minAge'].requiredAge} years old.`;
    if (errors['min']) return `Must be at least ${errors['min'].min}.`;
    if (errors['max']) return `Must be at most ${errors['max'].max}.`;
    if (errors['maxlength']) return `At most ${errors['maxlength'].requiredLength} characters.`;
    if (errors['futureDate']) return 'Date must lie in the future.';
    return 'Invalid value.';
  }
}
