import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NotificationService } from '../../../state/notification.service';

@Component({
  selector: 'app-toast-stack',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    @for (t of notifications.toasts(); track t.id) {
      <div class="toast" [class]="'toast--' + t.tone" role="status">
        <div class="body">
          <div class="title">{{ t.tone === 'paradox' ? '⚡ ' : '' }}{{ t.title }}</div>
          @if (t.message) { <div class="message">{{ t.message }}</div> }
          @if (t.link) {
            <a class="link" [routerLink]="t.link" (click)="notifications.dismiss(t.id)">Open trip →</a>
          }
        </div>
        <button type="button" class="close" (click)="notifications.dismiss(t.id)" aria-label="Dismiss">×</button>
      </div>
    }
  `,
  styles: `
    :host { position: fixed; right: 20px; bottom: 20px; z-index: 70; display: flex; flex-direction: column; gap: 10px;
            width: min(360px, calc(100vw - 32px)); }
    .toast { display: flex; gap: 10px; background: var(--surface); border: 1px solid var(--border);
             border-left: 3px solid var(--blue); border-radius: var(--radius); padding: 12px 14px;
             box-shadow: var(--shadow-overlay); animation: fadeSlideIn 0.25s ease; }
    .toast--success { border-left-color: var(--green); }
    .toast--error { border-left-color: var(--red); }
    .toast--paradox { border-left-color: var(--red); background: #241A1E; }
    .body { flex: 1; min-width: 0; }
    .title { font-weight: 600; font-size: 13.5px; }
    .message { font-size: 12.5px; color: var(--text-2); margin-top: 2px; }
    .link { display: inline-block; margin-top: 6px; font-size: 12px; }
    .close { border: none; background: none; color: var(--text-faint); font-size: 18px; cursor: pointer; align-self: flex-start; }
    .close:hover { color: var(--text); }
  `,
})
export class ToastStackComponent {
  protected readonly notifications = inject(NotificationService);
}
