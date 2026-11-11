import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Page title block with optional eyebrow, subtitle and projected action buttons. */
@Component({
  selector: 'app-page-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="text">
      @if (eyebrow()) {
        <div class="eyebrow">{{ eyebrow() }}</div>
      }
      <h1 class="display title">{{ title() }}</h1>
      @if (subtitle()) {
        <p class="subtitle">{{ subtitle() }}</p>
      }
    </div>
    <div class="actions"><ng-content /></div>
  `,
  styles: `
    :host { display: flex; justify-content: space-between; align-items: flex-end; flex-wrap: wrap; gap: 16px; margin-bottom: 32px; }
    .title { font-size: 30px; margin-top: 4px; }
    .subtitle { margin: 8px 0 0; color: var(--text-faint); font-size: 14px; max-width: 640px; }
    .actions { display: flex; gap: 10px; flex-wrap: wrap; }
    .actions:empty { display: none; }
  `,
})
export class PageHeaderComponent {
  readonly title = input.required<string>();
  readonly eyebrow = input<string>();
  readonly subtitle = input<string>();
}
