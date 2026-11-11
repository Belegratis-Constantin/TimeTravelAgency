import { createPuzzle, LOCK_THRESHOLD, resonance, seededRandom, targetAt, wavePath } from './phase-lock';

describe('phase lock', () => {
  it('is deterministic per paradox', () => {
    expect(createPuzzle('abc', 'BootstrapParadox')).toEqual(createPuzzle('abc', 'BootstrapParadox'));
    expect(createPuzzle('abc', 'BootstrapParadox').target).not.toEqual(createPuzzle('xyz', 'BootstrapParadox').target);
    const rnd = seededRandom('seed');
    expect(rnd()).toBeGreaterThanOrEqual(0);
    expect(rnd()).toBeLessThan(1);
  });

  it('identical waves resonate fully, the start position does not', () => {
    const puzzle = createPuzzle('paradox-1', 'GrandFatherParadox');
    expect(resonance(puzzle.type, puzzle.target, puzzle.target)).toBeCloseTo(1, 5);
    expect(resonance(puzzle.type, puzzle.start, puzzle.target)).toBeLessThan(LOCK_THRESHOLD);
  });

  it('a slightly detuned wave still locks, an opposed one does not', () => {
    const puzzle = createPuzzle('paradox-2', 'InformationParadox');
    const close = { ...puzzle.target, phase: puzzle.target.phase + 4 };
    const opposed = { ...puzzle.target, phase: puzzle.target.phase + 180 };
    expect(resonance(puzzle.type, close, puzzle.target)).toBeGreaterThan(LOCK_THRESHOLD);
    expect(resonance(puzzle.type, opposed, puzzle.target)).toBe(0);
  });

  it('drifts the paradox phase over time', () => {
    const puzzle = createPuzzle('paradox-3', 'GrandFatherParadox');
    expect(targetAt(puzzle, 10_000).phase).not.toBe(puzzle.target.phase);
    expect(targetAt(createPuzzle('paradox-3', 'BootstrapParadox'), 10_000).phase)
      .toBe(createPuzzle('paradox-3', 'BootstrapParadox').target.phase);
  });

  it('renders an SVG path', () => {
    const puzzle = createPuzzle('p', 'PredestinationParadox');
    expect(wavePath(puzzle.type, puzzle.target, 600, 200, 10)).toMatch(/^M0\.0,[\d.]+(L[\d.]+,[\d.]+){9}$/);
  });
});
