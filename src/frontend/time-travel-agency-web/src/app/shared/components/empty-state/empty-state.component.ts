import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="title">{{ title() }}</div>
    @if (message()) {
      <p class="message">{{ message() }}</p>
    }
    <ng-content />
  `,
  styles: `
    :host {
      display: block; text-align: center; padding: 48px 16px; border: 1px dashed var(--border); border-radius: var(--radius-lg);
      background: var(--bg-raised);
    }
    .title { font-size: 15px; font-weight: 600; color: var(--text); margin-bottom: 6px; }
    .message { margin: 0 auto 18px; max-width: 46ch; color: var(--text-muted); font-size: 13.5px; }
  `,
})
export class EmptyStateComponent {
  readonly title = input.required<string>();
  readonly message = input<string>();
}
