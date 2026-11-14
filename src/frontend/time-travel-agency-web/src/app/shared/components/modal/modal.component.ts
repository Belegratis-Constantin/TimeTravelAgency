import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { IconComponent } from '../icon/icon.component';

let nextId = 0;

/**
 * Dialog shell shared by every modal: backdrop, Escape/backdrop-click to close, title area.
 * Body content is projected; buttons go into an element marked with `modal-actions`.
 */
@Component({
  selector: 'app-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  host: { '(document:keydown.escape)': 'closed.emit()' },
  template: `
    <div class="backdrop" (click)="onBackdrop($event)">
      <section class="dialog" [style.width.px]="width()" role="dialog" aria-modal="true" [attr.aria-labelledby]="titleId">
        <header class="head">
          <h2 class="title" [id]="titleId">{{ title() }}</h2>
          @if (subtitle()) {
            <p class="subtitle">{{ subtitle() }}</p>
          }
          <button type="button" class="icon-btn icon-btn--ghost close" (click)="closed.emit()" aria-label="Close">
            <app-icon name="x" />
          </button>
        </header>
        <div class="content"><ng-content /></div>
        <footer class="actions">
          <ng-content select="[modal-actions]" />
        </footer>
      </section>
    </div>
  `,
  styles: `
    .backdrop { position: fixed; inset: 0; z-index: 50; display: flex; align-items: center; justify-content: center;
                padding: 16px; background: var(--scrim); animation: fadeIn 0.15s ease-out; }
    .dialog { position: relative; max-width: 100%; max-height: 92vh; overflow-y: auto; background: var(--surface);
              border: 1px solid var(--border); border-radius: 12px; box-shadow: var(--shadow-overlay);
              animation: popIn 0.22s var(--ease-out); }
    .head { padding: 18px 56px 14px 24px; border-bottom: 1px solid var(--border-subtle); }
    .title { font-size: 16px; }
    .subtitle { margin: 2px 0 0; font-size: 13px; color: var(--text-muted); }
    .close { position: absolute; top: 14px; right: 14px; }
    .content { padding: 20px 24px; }
    .actions:not(:empty) { display: flex; justify-content: flex-end; gap: 8px; padding: 12px 24px;
                           border-top: 1px solid var(--border-subtle); background: var(--bg-raised);
                           position: sticky; bottom: 0; border-radius: 0 0 12px 12px; }
  `,
})
export class ModalComponent {
  readonly title = input.required<string>();
  readonly subtitle = input<string>();
  readonly width = input(460);
  readonly closed = output<void>();

  protected readonly titleId = `modal-title-${nextId++}`;

  protected onBackdrop(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.closed.emit();
  }
}
