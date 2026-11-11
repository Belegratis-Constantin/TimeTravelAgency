import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './shared/components/header/header.component';
import { ToastStackComponent } from './shared/components/toast-stack/toast-stack.component';
import { IdentityPickerModalComponent } from './shared/components/identity-picker-modal/identity-picker-modal.component';
import { TutorialOverlayComponent } from './shared/components/tutorial-overlay/tutorial-overlay.component';
import { JoinTravellerModalComponent } from './features/modals/join-traveller-modal/join-traveller-modal.component';
import { AppStateService } from './state/app-state.service';
import { AgencyStore } from './state/agency.store';
import { ParadoxFeedStore } from './state/paradox-feed.store';

const TUTORIAL_KEY = 'tta_tutorial_seen';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterOutlet,
    HeaderComponent,
    ToastStackComponent,
    IdentityPickerModalComponent,
    JoinTravellerModalComponent,
    TutorialOverlayComponent,
  ],
  template: `
    <app-header />
    <main>
      <router-outlet />
    </main>

    @if (state.pendingRole()) {
      <app-identity-picker-modal />
    }
    @if (state.joinModalOpen()) {
      <app-join-traveller-modal (closed)="state.joinModalOpen.set(false)" />
    }
    @if (showTutorial()) {
      <app-tutorial-overlay (dismissed)="dismissTutorial()" />
    }
    <app-toast-stack />
  `,
  styles: `:host { display: block; min-height: 100vh; background: var(--bg); color: var(--text); }`,
})
export class App {
  protected readonly state = inject(AppStateService);
  private readonly agency = inject(AgencyStore);

  protected readonly showTutorial = signal(readFlag(TUTORIAL_KEY) !== '1');

  constructor() {
    this.agency.ensureLoaded();
    inject(ParadoxFeedStore).start();

    // A stored identity can vanish when the backend reseeds — ask for a new one instead of showing empty pages.
    effect(() => {
      if (this.agency.status() === 'ready' && this.state.missingIdentity() && !this.state.pendingRole()) {
        const role = this.state.role();
        if (role !== 'customer' && role !== 'time') this.state.requestRole(role);
      }
    });
  }

  protected dismissTutorial(): void {
    try {
      localStorage.setItem(TUTORIAL_KEY, '1');
    } catch {
      /* ignore */
    }
    this.showTutorial.set(false);
  }
}

function readFlag(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
