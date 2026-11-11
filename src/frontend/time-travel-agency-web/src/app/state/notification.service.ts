import { Injectable, signal } from '@angular/core';

export type ToastTone = 'info' | 'success' | 'error' | 'paradox';

export interface Toast {
  id: number;
  tone: ToastTone;
  title: string;
  message?: string;
  link?: string[];
}

const DEFAULT_DURATION_MS = 6000;
const MAX_TOASTS = 4;

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private nextId = 1;
  readonly toasts = signal<Toast[]>([]);

  show(toast: Omit<Toast, 'id'>, durationMs = DEFAULT_DURATION_MS): number {
    const id = this.nextId++;
    this.toasts.update(list => [...list, { ...toast, id }].slice(-MAX_TOASTS));
    if (durationMs > 0) setTimeout(() => this.dismiss(id), durationMs);
    return id;
  }

  success(title: string, message?: string): number {
    return this.show({ tone: 'success', title, message });
  }

  error(title: string, message?: string): number {
    return this.show({ tone: 'error', title, message }, 9000);
  }

  dismiss(id: number): void {
    this.toasts.update(list => list.filter(t => t.id !== id));
  }
}
