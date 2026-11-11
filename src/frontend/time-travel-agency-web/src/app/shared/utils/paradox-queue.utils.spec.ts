import { inQueueOrder, queueLabel } from './paradox-queue.utils';

const p = (guid: string, queuePosition: number | null, resolvedAt: string | null = null) => ({
  guid, queuePosition, resolvedAt, createdAt: '2026-01-01T00:00:00Z',
});

describe('paradox queue', () => {
  it('orders open paradoxes by queue position, then solved ones newest first', () => {
    const list = [
      p('solved-old', null, '2026-01-01T01:00:00Z'),
      p('next', 1),
      p('solved-new', null, '2026-01-01T02:00:00Z'),
      p('now', 0),
    ];
    expect(inQueueOrder(list).map(x => x.guid)).toEqual(['now', 'next', 'solved-new', 'solved-old']);
  });

  it('labels the place in the queue', () => {
    expect(queueLabel({ queuePosition: 0 })).toBe('Now');
    expect(queueLabel({ queuePosition: 1 })).toBe('Next');
    expect(queueLabel({ queuePosition: 3 })).toBe('#4');
    expect(queueLabel({ queuePosition: null })).toBeNull();
  });
});
