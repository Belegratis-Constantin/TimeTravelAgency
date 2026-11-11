import { Routes } from '@angular/router';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  // Customer
  {
    path: '',
    title: 'Destinations',
    canActivate: [roleGuard('customer')],
    loadComponent: () => import('./features/landing/landing.component').then(m => m.LandingComponent),
  },
  {
    path: 'timeline',
    title: 'The Continuum',
    canActivate: [roleGuard('customer')],
    loadComponent: () => import('./features/era-timeline/era-timeline.component').then(m => m.EraTimelineComponent),
  },
  {
    path: 'profile',
    title: 'My Journeys',
    canActivate: [roleGuard('customer')],
    loadComponent: () => import('./features/customer-profile/customer-profile.component').then(m => m.CustomerProfileComponent),
  },

  // Every role
  {
    path: 'trip/:guid',
    title: 'Trip',
    loadComponent: () => import('./features/trip-detail/trip-detail.component').then(m => m.TripDetailComponent),
  },

  // Agent
  {
    path: 'missions',
    title: 'My Missions',
    canActivate: [roleGuard('agent')],
    loadComponent: () => import('./features/agent-missions/agent-missions.component').then(m => m.AgentMissionsComponent),
  },

  // Manager & Director
  {
    path: 'dashboard',
    title: 'Dashboard',
    canActivate: [roleGuard('manager')],
    loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
  },
  {
    path: 'paradoxes',
    title: 'Paradox Log',
    canActivate: [roleGuard('manager', 'director')],
    loadComponent: () => import('./features/paradox-log/paradox-log.component').then(m => m.ParadoxLogComponent),
  },
  {
    path: 'reports',
    title: 'Field Reports',
    canActivate: [roleGuard('manager', 'director')],
    loadComponent: () => import('./features/reports/reports.component').then(m => m.ReportsComponent),
  },
  {
    path: 'director',
    title: 'Command Centre',
    canActivate: [roleGuard('director')],
    loadComponent: () => import('./features/director-dashboard/director-dashboard.component').then(m => m.DirectorDashboardComponent),
  },

  // Time itself
  {
    path: 'loom',
    title: 'The Loom',
    canActivate: [roleGuard('time')],
    loadComponent: () => import('./features/loom/loom.component').then(m => m.LoomComponent),
  },

  { path: 'paradox-log', redirectTo: 'paradoxes' },
  { path: '**', redirectTo: '' },
];
