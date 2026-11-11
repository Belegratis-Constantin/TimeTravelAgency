import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

let nextId = 0;

/**
 * Dialog shell shared by every modal: backdrop, Escape/backdrop-click to close, title area.
 * Body content is projected; buttons go into an element marked with `modal-actions`.
 */
@Component({
  selector: 'app-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'closed.emit()' },
  template: `
    <div class="backdrop" (click)="onBackdrop($event)">
      <section class="dialog" [style.width.px]="width()" role="dialog" aria-modal="true" [attr.aria-labelledby]="titleId">
        <header class="head">
          <h2 class="display title" [id]="titleId">{{ title() }}</h2>
          @if (subtitle()) {
            <p class="subtitle">{{ subtitle() }}</p>
          }
          <button type="button" class="close" (click)="closed.emit()" aria-label="Close">×</button>
        </header>
        <ng-content />
        <footer class="actions">
          <ng-content select="[modal-actions]" />
        </footer>
      </section>
    </div>
  `,
  styles: `
    .backdrop { position: fixed; inset: 0; z-index: 50; display: flex; align-items: center; justify-content: center;
                padding: 16px; background: rgba(5, 7, 12, 0.8); }
    .dialog { position: relative; max-width: 100%; max-height: 92vh; overflow-y: auto; background: var(--surface);
              border-radius: 6px; padding: 32px 36px; box-shadow: var(--shadow-overlay); animation: fadeSlideIn 0.2s ease; }
    .head { margin-bottom: 22px; padding-right: 28px; }
    .title { font-size: 22px; }
    .subtitle { margin: 6px 0 0; font-size: 13px; color: var(--text-muted); }
    .close { position: absolute; top: 14px; right: 14px; width: 30px; height: 30px; border: none; border-radius: 50%;
             background: transparent; color: var(--text-faint); font-size: 20px; cursor: pointer; }
    .close:hover { background: var(--border-subtle); color: var(--text); }
    .actions:not(:empty) { display: flex; justify-content: flex-end; gap: 12px; margin-top: 24px; }
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
