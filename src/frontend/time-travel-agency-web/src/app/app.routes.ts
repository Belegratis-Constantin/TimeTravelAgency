import { Routes } from '@angular/router';
import { LandingComponent } from './features/landing/landing.component';
import { TripDetailComponent } from './features/trip-detail/trip-detail.component';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { ParadoxLogComponent } from './features/paradox-log/paradox-log.component';
import { ReportsComponent } from './features/reports/reports.component';
import { EraTimelineComponent } from './features/era-timeline/era-timeline.component';
import { DirectorDashboardComponent } from './features/director-dashboard/director-dashboard.component';
import { CustomerProfileComponent } from './features/customer-profile/customer-profile.component';
import { LoomComponent } from './features/loom/loom.component';

export const routes: Routes = [
  { path: '', component: LandingComponent },
  { path: 'timeline', component: EraTimelineComponent },
  { path: 'trip/:guid', component: TripDetailComponent },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'paradox-log', component: ParadoxLogComponent },
  { path: 'reports', component: ReportsComponent },
  { path: 'director', component: DirectorDashboardComponent },
  { path: 'profile', component: CustomerProfileComponent },
  { path: 'loom', component: LoomComponent },
  { path: '**', redirectTo: '' },
];
