import { ParadoxFeedDto } from '../../core/models/paradox.model';

type QueueFields = Pick<ParadoxFeedDto, 'queuePosition' | 'createdAt' | 'resolvedAt'>;

/**
 * A trip's paradoxes in working order: the open ones as queued (current one first),
 * then the solved ones, most recently solved first. Returns a new array.
 */
export function inQueueOrder<T extends QueueFields>(paradoxes: readonly T[]): T[] {
  const time = (s: string | null) => (s ? Date.parse(s) : 0);
  return [...paradoxes].sort((a, b) => {
    const qa = a.queuePosition ?? Number.POSITIVE_INFINITY;
    const qb = b.queuePosition ?? Number.POSITIVE_INFINITY;
    if (qa !== qb) return qa - qb;
    return time(b.resolvedAt ?? b.createdAt) - time(a.resolvedAt ?? a.createdAt);
  });
}

/** Short label for a paradox's place in its trip's queue ("Now", "Next", "#3"), or null once solved. */
export function queueLabel(p: Pick<ParadoxFeedDto, 'queuePosition'>): string | null {
  if (p.queuePosition == null) return null;
  if (p.queuePosition === 0) return 'Now';
  return p.queuePosition === 1 ? 'Next' : `#${p.queuePosition + 1}`;
}
