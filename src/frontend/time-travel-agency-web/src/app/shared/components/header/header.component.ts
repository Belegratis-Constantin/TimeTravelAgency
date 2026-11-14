import { ChangeDetectionStrategy, Component, computed, ElementRef, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AppStateService, Role, ROLES } from '../../../state/app-state.service';
import { ParadoxFeedStore } from '../../../state/paradox-feed.store';
import { ThemeService } from '../../../state/theme.service';
import { IconComponent } from '../icon/icon.component';

interface NavItem {
  path: string;
  label: string;
  exact?: boolean;
  requiresIdentity?: boolean;
}

/** Navigation per role — the single place that decides which pages a role sees. */
const NAV: Record<Role, NavItem[]> = {
  customer: [
    { path: '/', label: 'Destinations', exact: true },
    { path: '/timeline', label: 'The Continuum' },
    { path: '/profile', label: 'My Journeys', requiresIdentity: true },
  ],
  agent: [{ path: '/missions', label: 'My Missions' }],
  manager: [
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/paradoxes', label: 'Paradox Log' },
    { path: '/reports', label: 'Field Reports' },
  ],
  director: [
    { path: '/director', label: 'Command Centre' },
    { path: '/paradoxes', label: 'Paradox Log' },
    { path: '/reports', label: 'Field Reports' },
  ],
  time: [{ path: '/loom', label: 'The Loom' }],
};

/** Rank pips shown beside the role — the agency's chain of command (design only). */
const RANK: Record<Role, number> = { customer: 0, agent: 1, manager: 2, director: 3, time: 0 };

/** Where the open-paradox counter leads for each role. */
const PARADOX_TARGET: Record<Role, string> = {
  customer: '/profile',
  agent: '/missions',
  manager: '/paradoxes',
  director: '/paradoxes',
  time: '/loom',
};

@Component({
  selector: 'app-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive, IconComponent],
  host: { '(document:click)': 'onDocumentClick($event)', '(document:keydown.escape)': 'menuOpen.set(false)' },
  templateUrl: './header.component.html',
  styleUrl: './header.component.css',
})
export class HeaderComponent {
  protected readonly state = inject(AppStateService);
  protected readonly feed = inject(ParadoxFeedStore);
  private readonly router = inject(Router);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly theme = inject(ThemeService);

  protected readonly roles = ROLES;
  protected readonly rank = RANK;
  protected readonly pips = [1, 2, 3];
  protected readonly menuOpen = signal(false);

  protected readonly navItems = computed(() =>
    NAV[this.state.role()].filter(item => !item.requiresIdentity || this.state.hasIdentity(this.state.role())),
  );

  /** Paradoxes are internal — customers never see the counter. */
  protected readonly showParadoxCounter = computed(() => !this.state.isCustomer() && this.state.hasIdentity(this.state.role()));
  protected readonly paradoxTarget = computed(() => PARADOX_TARGET[this.state.role()]);

  protected selectRole(role: Role): void {
    this.menuOpen.set(false);
    if (role === 'time') {
      this.state.enterTimeMode();
      this.router.navigateByUrl('/loom');
    } else {
      this.state.requestRole(role);
    }
  }

  protected onDocumentClick(event: MouseEvent): void {
    if (this.menuOpen() && !this.host.nativeElement.querySelector('.role')?.contains(event.target as Node)) {
      this.menuOpen.set(false);
    }
  }
}
