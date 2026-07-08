import { Routes } from '@angular/router';
import { LandingComponent } from './features/landing/landing.component';
import { TripDetailComponent } from './features/trip-detail/trip-detail.component';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { ParadoxLogComponent } from './features/paradox-log/paradox-log.component';
import { ReportsComponent } from './features/reports/reports.component';

export const routes: Routes = [
  { path: '', component: LandingComponent },
  { path: 'trip/:guid', component: TripDetailComponent },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'paradox-log', component: ParadoxLogComponent },
  { path: 'reports', component: ReportsComponent },
  { path: '**', redirectTo: '' },
];
