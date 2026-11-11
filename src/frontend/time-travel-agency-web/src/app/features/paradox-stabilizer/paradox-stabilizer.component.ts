import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, input, output, signal } from '@angular/core';
import { ParadoxFeedDto } from '../../core/models/paradox.model';
import { ParadoxFeedStore } from '../../state/paradox-feed.store';
import { toErrorMessage } from '../../core/http/error-message';
import { AppStateService } from '../../state/app-state.service';
import { BLOCK_TEXT, stabiliseBlock } from '../../shared/utils/dual-lock.utils';
import { ModalComponent } from '../../shared/components/modal/modal.component';
import { paradoxTypeColor, paradoxTypeLabel, tripDisplayName } from '../../shared/utils/status.utils';
import {
  createPuzzle, LOCK_HOLD_MS, LOCK_THRESHOLD, RANGES, resonance, targetAt, TYPE_RULES, WaveParams, wavePath,
} from './phase-lock';

/** `held`: dual lock — this agent's lock holds, the partner's round is still missing. */
type Phase = 'briefing' | 'engaging' | 'playing' | 'reporting' | 'won' | 'held' | 'lost';
type Param = keyof WaveParams;

const VIEW_W = 600;
const VIEW_H = 200;

/**
 * Field stabilisation of a paradox as a mini-game ("Phase Lock"): tune the counter-wave until it resonates with the
 * paradox wave and hold the lock. Winning solves the paradox, running out of time escalates it to the manager.
 * An escalated paradox needs a dual lock: licensed and support agent each win a (harder) round; if either of them
 * loses, both locks break and both have to play again.
 */
@Component({
  selector: 'app-paradox-stabilizer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ModalComponent],
  templateUrl: './paradox-stabilizer.component.html',
  styleUrl: './paradox-stabilizer.component.css',
})
export class ParadoxStabilizerComponent {
  readonly paradox = input.required<ParadoxFeedDto>();
  readonly closed = output<void>();

  private readonly feed = inject(ParadoxFeedStore);
  private readonly state = inject(AppStateService);

  protected readonly ranges = RANGES;
  protected readonly viewW = VIEW_W;
  protected readonly viewH = VIEW_H;
  protected readonly threshold = LOCK_THRESHOLD;

  protected readonly phase = signal<Phase>('briefing');
  protected readonly error = signal<string | null>(null);
  protected readonly elapsed = signal(0);
  protected readonly lockMs = signal(0);
  protected readonly attempt = signal(1);
  protected readonly wave = signal<WaveParams>({ frequency: 1, phase: 0, amplitude: 0.5 });

  /** Live version from the feed — the paradox can become escalated (dual lock) while the dialog is open. */
  protected readonly current = computed(() => this.feed.paradoxes().find(p => p.guid === this.paradox().guid) ?? this.paradox());
  protected readonly dual = computed(() => this.current().dualLockRequired);
  /** Why this agent cannot start a round right now (e.g. own dual lock already holds), or null. */
  protected readonly blockText = computed(() => {
    const block = stabiliseBlock(this.current(), this.state.currentAgent()?.id);
    return block === 'none' ? null : block === 'closed' ? 'This paradox is already stabilised.' : BLOCK_TEXT[block];
  });
  /** Fixed for the duration of one round, so a status change mid-round does not swap the puzzle. */
  protected readonly roundDual = signal(false);

  protected readonly puzzle = computed(() =>
    createPuzzle(`${this.paradox().guid}#${this.attempt()}`, this.paradox().paradoxType, this.roundDual()),
  );
  protected readonly accent = computed(() => paradoxTypeColor(this.paradox().paradoxType));
  protected readonly typeLabel = computed(() => paradoxTypeLabel(this.paradox().paradoxType));
  protected readonly tripName = computed(() => tripDisplayName(this.paradox()));
  protected readonly briefing = computed(() => TYPE_RULES[this.paradox().paradoxType]?.briefing ?? '');

  protected readonly target = computed(() => targetAt(this.puzzle(), this.elapsed()));
  protected readonly targetPath = computed(() => wavePath(this.puzzle().type, this.target(), VIEW_W, VIEW_H));
  protected readonly wavePathD = computed(() => wavePath(this.puzzle().type, this.wave(), VIEW_W, VIEW_H));
  protected readonly resonance = computed(() => resonance(this.puzzle().type, this.wave(), this.target()));
  protected readonly resonancePct = computed(() => Math.round(this.resonance() * 100));
  protected readonly locked = computed(() => this.resonance() >= LOCK_THRESHOLD);
  protected readonly lockPct = computed(() => Math.min(100, (this.lockMs() / LOCK_HOLD_MS) * 100));
  protected readonly remainingMs = computed(() => Math.max(0, this.puzzle().timeLimitMs - this.elapsed()));
  protected readonly remainingSec = computed(() => Math.ceil(this.remainingMs() / 1000));
  protected readonly timePct = computed(() => (this.remainingMs() / this.puzzle().timeLimitMs) * 100);
  /** Visual instability: the less resonance, the more the paradox wave glitches. */
  protected readonly instability = computed(() => (1 - this.resonance()).toFixed(2));

  private frame: number | null = null;
  private lastTick = 0;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.stopLoop());
  }

  /** The paradox must be in process before the game starts — only then does the backend accept the outcome. */
  protected begin(): void {
    this.error.set(null);
    this.phase.set('engaging');
    this.feed.engage(this.paradox()).subscribe({
      next: () => this.startGame(),
      error: err => {
        this.error.set(toErrorMessage(err, 'Could not take over this paradox.'));
        this.phase.set('briefing');
      },
    });
  }

  protected retry(): void {
    this.attempt.update(n => n + 1);
    this.begin();
  }

  private startGame(): void {
    this.roundDual.set(this.dual());
    const puzzle = this.puzzle();
    this.wave.set({ ...puzzle.start });
    this.elapsed.set(0);
    this.lockMs.set(0);
    this.phase.set('playing');
    this.lastTick = performance.now();
    this.frame = requestAnimationFrame(t => this.tick(t));
  }

  protected set(param: Param, value: string): void {
    const n = Number(value);
    if (Number.isFinite(n)) this.wave.update(w => ({ ...w, [param]: n }));
  }

  protected close(): void {
    // Leaving mid-game is not a failure — the paradox simply stays in process.
    this.stopLoop();
    this.closed.emit();
  }

  private tick(now: number): void {
    const dt = Math.min(100, now - this.lastTick);
    this.lastTick = now;
    this.elapsed.update(e => e + dt);
    this.lockMs.update(ms => (this.locked() ? ms + dt : Math.max(0, ms - dt * 2)));

    if (this.lockMs() >= LOCK_HOLD_MS) return this.finish(true);
    if (this.remainingMs() <= 0) return this.finish(false);
    this.frame = requestAnimationFrame(t => this.tick(t));
  }

  private finish(won: boolean): void {
    this.stopLoop();
    this.phase.set('reporting');
    this.feed.stabilise(this.paradox(), won).subscribe({
      next: updated => this.phase.set(!won ? 'lost' : updated.paradoxStatus === 'Solved' ? 'won' : 'held'),
      error: () => {
        this.error.set('The result could not be transmitted to headquarters.');
        this.phase.set(won ? 'won' : 'lost');
      },
    });
  }

  private stopLoop(): void {
    if (this.frame !== null) cancelAnimationFrame(this.frame);
    this.frame = null;
  }
}
