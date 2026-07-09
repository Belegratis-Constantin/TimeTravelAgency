import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './shared/components/header/header.component';
import { TutorialOverlayComponent } from './shared/components/tutorial-overlay/tutorial-overlay.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent, TutorialOverlayComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  readonly showTutorial = signal(
    typeof localStorage !== 'undefined' &&
    localStorage.getItem('tta_tutorial_seen') !== '1'
  );

  dismissTutorial(): void {
    localStorage.setItem('tta_tutorial_seen', '1');
    this.showTutorial.set(false);
  }
}
