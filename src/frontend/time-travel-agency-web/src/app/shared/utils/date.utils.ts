import { COLORS } from '../constants/design';

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatDateOnly(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export interface TimeUntil {
  label: string;
  color: string;
}

export function timeUntil(iso: string): TimeUntil {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return { label: 'Departed', color: COLORS.textFaint };

  const mins = Math.round(diff / 60_000);
  if (mins < 60) return { label: `Departs in ${mins}m`, color: '#D9A24E' };

  const hours = Math.floor(diff / 3_600_000);
  if (hours < 24) return { label: `Departs in ${hours}h ${mins % 60}m`, color: '#D9A24E' };

  const days = Math.floor(diff / (24 * 3_600_000));
  return { label: `Departs in ${days}d`, color: COLORS.textMuted };
}

export function isBookingOpen(iso: string): boolean {
  return new Date(iso).getTime() - Date.now() > 3_600_000;
}

export function isDeparted(iso: string): boolean {
  return new Date(iso).getTime() <= Date.now();
}
