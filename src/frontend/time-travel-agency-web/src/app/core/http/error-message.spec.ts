import { HttpErrorResponse } from '@angular/common/http';
import { toErrorMessage } from './error-message';

describe('toErrorMessage', () => {
  it('reads the detail of ASP.NET ProblemDetails', () => {
    const err = new HttpErrorResponse({ status: 400, error: { title: 'Bad Request', detail: 'Trip is already booked.' } });
    expect(toErrorMessage(err)).toBe('Trip is already booked.');
  });

  it('parses ProblemDetails delivered as text (responseType: text)', () => {
    const err = new HttpErrorResponse({ status: 409, error: JSON.stringify({ detail: 'Cannot manage more than 5 trips.' }) });
    expect(toErrorMessage(err)).toBe('Cannot manage more than 5 trips.');
  });

  it('returns the first validation error', () => {
    const err = new HttpErrorResponse({ status: 400, error: { title: 'Validation', errors: { Email: ['The Email field is required.'] } } });
    expect(toErrorMessage(err)).toBe('The Email field is required.');
  });

  it('explains network failures and falls back otherwise', () => {
    expect(toErrorMessage(new HttpErrorResponse({ status: 0 }))).toContain('unreachable');
    expect(toErrorMessage(new HttpErrorResponse({ status: 500, error: null }), 'Fallback')).toBe('Fallback');
  });
});
