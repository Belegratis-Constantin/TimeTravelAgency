import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AppStateService, Role } from '../../state/app-state.service';

/** Allows a route only for the given roles; everyone else is sent to the home page of their own role. */
export function roleGuard(...roles: Role[]): CanActivateFn {
  return () => {
    const app = inject(AppStateService);
    return roles.includes(app.role()) ? true : inject(Router).parseUrl(app.homeRoute());
  };
}
