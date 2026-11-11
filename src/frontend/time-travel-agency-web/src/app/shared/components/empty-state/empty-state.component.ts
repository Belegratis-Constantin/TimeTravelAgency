import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="display title">{{ title() }}</div>
    @if (message()) {
      <p class="message">{{ message() }}</p>
    }
    <ng-content />
  `,
  styles: `
    :host { display: block; text-align: center; padding: 64px 16px; }
    .title { font-size: 21px; color: var(--text-faint); margin-bottom: 10px; }
    .message { margin: 0 auto 24px; max-width: 420px; color: var(--text-faint); font-size: 14px; }
  `,
})
export class EmptyStateComponent {
  readonly title = input.required<string>();
  readonly message = input<string>();
}
