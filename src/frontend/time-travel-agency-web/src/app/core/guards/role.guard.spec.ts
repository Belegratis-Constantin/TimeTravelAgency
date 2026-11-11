import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, UrlTree } from '@angular/router';
import { AppStateService } from '../../state/app-state.service';
import { roleGuard } from './role.guard';

describe('roleGuard', () => {
  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
  });

  const run = (...roles: Parameters<typeof roleGuard>) =>
    TestBed.runInInjectionContext(() => roleGuard(...roles)({} as never, {} as never));

  it('lets matching roles through', () => {
    expect(run('customer')).toBe(true);
  });

  it('redirects other roles to their own home page', () => {
    TestBed.inject(AppStateService).enterTimeMode();
    const result = run('manager', 'director') as UrlTree;
    expect(TestBed.inject(Router).serializeUrl(result)).toBe('/loom');
  });
});
