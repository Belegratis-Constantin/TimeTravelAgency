import { Component, inject } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { AppStateService, Role } from '../../../state/app-state.service';
import { IdentityPickerModalComponent } from '../identity-picker-modal/identity-picker-modal.component';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, IdentityPickerModalComponent],
  templateUrl: './header.component.html',
})
export class HeaderComponent {
  protected readonly state = inject(AppStateService);
  private readonly router = inject(Router);

  enterTime(): void {
    this.state.enterTimeMode();
    this.router.navigate(['/loom']);
  }

  requestRole(role: Role): void {
    this.state.requestRole(role);
    if (role === 'manager') {
      this.router.navigate(['/dashboard']);
    } else if (role === 'director') {
      this.router.navigate(['/director']);
    } else if (role === 'agent') {
      this.router.navigate(['/']);
    } else {
      this.router.navigate(['/']);
    }
  }

  navColor(path: string): string {
    return this.router.url === path ? '#C9A84C' : '#B7BFCC';
  }

  navBorder(path: string): string {
    return this.router.url === path ? '2px solid #C9A84C' : '2px solid transparent';
  }
}
