import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/** Mirrors the backend's PhoneNumberAttribute: "+" followed by 11–15 digits. */
export const PHONE_PATTERN = /^\+\d{11,15}$/;
export const PHONE_HINT = 'International format, e.g. +431234567890';

/** Mirrors the backend's MinimumAgeAttribute. Expects an ISO date string (yyyy-mm-dd). */
export function minAge(years: number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) return null;
    const birth = new Date(control.value);
    if (Number.isNaN(birth.getTime())) return { minAge: { requiredAge: years } };
    const threshold = new Date();
    threshold.setFullYear(threshold.getFullYear() - years);
    return birth <= threshold ? null : { minAge: { requiredAge: years } };
  };
}

export function futureDate(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) return null;
    return new Date(control.value).getTime() > Date.now() ? null : { futureDate: true };
  };
}
