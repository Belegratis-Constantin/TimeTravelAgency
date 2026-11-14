import { Injectable, signal } from '@angular/core';

export type Theme = 'light' | 'dark';

const THEME_KEY = 'tta_theme';

/** Light / dark theme. Persists the choice; without one it follows the operating system. */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly theme = signal<Theme>(initialTheme());

  constructor() {
    apply(this.theme());
  }

  toggle(): void {
    const next: Theme = this.theme() === 'dark' ? 'light' : 'dark';
    this.theme.set(next);
    apply(next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      /* ignore */
    }
  }
}

function initialTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    /* ignore */
  }
  return typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function apply(theme: Theme): void {
  document.documentElement.dataset['theme'] = theme;
}
