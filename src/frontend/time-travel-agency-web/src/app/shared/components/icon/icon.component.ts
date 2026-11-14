import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** One stroke weight, one grid (24 px, round caps) — every pictogram in the app comes from this set. */
const ICONS = {
  'arrow-left': 'M19 12H5M12 19l-7-7 7-7',
  'arrow-right': 'M5 12h14M12 5l7 7-7 7',
  plus: 'M12 5v14M5 12h14',
  check: 'M20 6 9 17l-5-5',
  x: 'M18 6 6 18M6 6l12 12',
  'chevron-down': 'm6 9 6 6 6-6',
  'chevron-up': 'm18 15-6-6-6 6',
  alert: 'm21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3ZM12 9v4M12 17h.01',
  zap: 'M13 2 3 14h9l-1 8 10-12h-9l1-8z',
  lock: 'M5 11h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2ZM7 11V7a5 5 0 0 1 10 0v4',
  sun: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41',
  moon: 'M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z',
  hourglass:
    'M5 22h14M5 2h14M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2',
  award: 'M12 15a6 6 0 1 0 0-12 6 6 0 0 0 0 12ZM8.21 13.89 7 22l5-3 5 3-1.21-8.12',
  shield:
    'M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1zM9 12l2 2 4-4',
  compass: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20ZM16.24 7.76l-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z',
} as const;

export type IconName = keyof typeof ICONS;

@Component({
  selector: 'app-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true' },
  template: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
      <path [attr.d]="path()" />
    </svg>
  `,
  styles: `
    :host { display: inline-flex; width: 1.15em; height: 1.15em; flex-shrink: 0; vertical-align: -0.18em; }
    svg { width: 100%; height: 100%; }
  `,
})
export class IconComponent {
  readonly name = input.required<IconName>();
  protected readonly path = computed(() => ICONS[this.name()]);
}
