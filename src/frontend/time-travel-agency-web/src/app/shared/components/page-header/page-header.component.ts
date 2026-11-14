import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Page title block with optional eyebrow, subtitle and projected action buttons. */
@Component({
  selector: 'app-page-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="text">
      <div class="title-row">
        <h1 class="title">{{ title() }}</h1>
        @if (eyebrow()) {
          <span class="tag">{{ eyebrow() }}</span>
        }
      </div>
      @if (subtitle()) {
        <p class="subtitle">{{ subtitle() }}</p>
      }
    </div>
    <div class="actions"><ng-content /></div>
  `,
  styles: `
    :host { display: flex; justify-content: space-between; align-items: flex-end; flex-wrap: wrap; gap: 16px; margin-bottom: 24px; }
    .title-row { display: flex; align-items: center; flex-wrap: wrap; gap: 6px 12px; }
    .title { font-size: 24px; letter-spacing: -0.025em; line-height: 1.2; }
    .subtitle { margin: 6px 0 0; color: var(--text-muted); font-size: 13.5px; max-width: 64ch; }
    .actions { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
    .actions:empty { display: none; }
  `,
})
export class PageHeaderComponent {
  readonly title = input.required<string>();
  readonly eyebrow = input<string>();
  readonly subtitle = input<string>();
}
