import { HttpErrorResponse } from '@angular/common/http';

interface ProblemDetails {
  title?: string;
  detail?: string;
  errors?: Record<string, string[]>;
}

/**
 * Turns any HTTP error into a single human-readable sentence.
 * Handles ASP.NET ProblemDetails (`detail`), validation problems (`errors`), plain text bodies
 * and network failures (status 0).
 */
export function toErrorMessage(err: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (!(err instanceof HttpErrorResponse)) {
    return err instanceof Error && err.message ? err.message : fallback;
  }
  if (err.status === 0) return 'The agency server is unreachable — is the backend running?';

  const body = parseBody(err.error);
  if (typeof body === 'string' && body.trim()) return body;
  if (body && typeof body === 'object') {
    const problem = body as ProblemDetails;
    if (problem.errors) {
      const first = Object.values(problem.errors).flat()[0];
      if (first) return first;
    }
    if (problem.detail) return problem.detail;
    if (problem.title) return problem.title;
  }
  return fallback;
}

function parseBody(body: unknown): unknown {
  if (typeof body !== 'string') return body;
  try {
    return JSON.parse(body);
  } catch {
    return body;
  }
}
