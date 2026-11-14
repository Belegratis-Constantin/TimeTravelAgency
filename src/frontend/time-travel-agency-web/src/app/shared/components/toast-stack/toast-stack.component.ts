import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NotificationService } from '../../../state/notification.service';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'app-toast-stack',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, IconComponent],
  template: `
    @for (t of notifications.toasts(); track t.id) {
      <div class="toast" [class]="'toast--' + t.tone" role="status">
        <span class="glyph">
          <app-icon [name]="t.tone === 'paradox' ? 'zap' : t.tone === 'error' ? 'alert' : 'check'" />
        </span>
        <div class="body">
          <div class="title">{{ t.title }}</div>
          @if (t.message) { <div class="message">{{ t.message }}</div> }
          @if (t.link) {
            <a class="link" [routerLink]="t.link" (click)="notifications.dismiss(t.id)">Open trip <app-icon name="arrow-right" /></a>
          }
        </div>
        <button type="button" class="icon-btn icon-btn--ghost close" (click)="notifications.dismiss(t.id)" aria-label="Dismiss">
          <app-icon name="x" />
        </button>
      </div>
    }
  `,
  styles: `
    :host { position: fixed; right: 20px; bottom: 20px; z-index: 70; display: flex; flex-direction: column; gap: 8px;
            width: min(360px, calc(100vw - 32px)); }
    .toast { --tone: var(--blue); display: flex; gap: 10px; align-items: flex-start; background: var(--surface);
             border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 10px 8px 10px 12px;
             box-shadow: var(--shadow-overlay); animation: toastIn 0.32s var(--ease-out); }
    .toast--success { --tone: var(--green); }
    .toast--error { --tone: var(--red); }
    .toast--paradox { --tone: var(--red); border-color: color-mix(in srgb, var(--red) 40%, var(--border)); }
    .glyph { display: grid; place-items: center; width: 24px; height: 24px; border-radius: 50%; flex-shrink: 0; font-size: 13px;
             color: var(--tone); background: color-mix(in srgb, var(--tone) 13%, transparent); }
    .toast--paradox .glyph { animation: livePulse 1.4s ease-out 3; }
    .body { flex: 1; min-width: 0; padding-top: 2px; }
    .title { font-weight: 600; font-size: 13px; }
    .message { font-size: 12.5px; color: var(--text-muted); margin-top: 1px; }
    .link { display: inline-flex; align-items: center; gap: 4px; margin-top: 6px; font-size: 12.5px; font-weight: 500; }
    .close { width: 24px; height: 24px; }
    @keyframes toastIn { from { opacity: 0; transform: translateX(16px) scale(0.98); } to { opacity: 1; transform: none; } }
  `,
})
export class ToastStackComponent {
  protected readonly notifications = inject(NotificationService);
}
