import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval } from 'rxjs';
import { ParadoxService } from '../../../core/services/paradox.service';
import { ParadoxSimulationDto, SpawnParadoxResultDto } from '../../../core/models/paradox.model';
import { TripDto } from '../../../core/models/trip.model';
import { toErrorMessage } from '../../../core/http/error-message';
import { ParadoxFeedStore } from '../../../state/paradox-feed.store';
import { tripDisplayName } from '../../../shared/utils/status.utils';

const INTERVAL_PRESETS = [10, 30, 45, 60, 120, 300];

/**
 * Controls for the backend's runtime paradox generator (GET/PUT /api/Simulation) plus manual
 * triggers — the testing surface for paradoxes appearing while the app runs.
 */
@Component({
  selector: 'app-simulation-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './simulation-panel.component.html',
  styleUrl: './simulation-panel.component.css',
})
export class SimulationPanelComponent {
  readonly trips = input.required<TripDto[]>();
  /** Emitted after a paradox was introduced, so the Loom can play its spark animation. */
  readonly spawned = output<SpawnParadoxResultDto>();

  private readonly api = inject(ParadoxService);
  private readonly feed = inject(ParadoxFeedStore);

  protected readonly presets = INTERVAL_PRESETS;
  protected readonly tripName = tripDisplayName;

  protected readonly simulation = signal<ParadoxSimulationDto | null>(null);
  protected readonly target = signal('');
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  private readonly now = signal(Date.now());

  protected readonly activeTrips = computed(() => this.trips().filter(t => t.tripStatus === 'Active'));

  protected readonly countdown = computed(() => {
    const next = this.simulation()?.nextSpawnAt;
    if (!next) return null;
    const seconds = Math.max(0, Math.round((Date.parse(next) - this.now()) / 1000));
    return `${seconds}s`;
  });

  constructor() {
    this.load();
    // Tick the countdown every second; re-sync with the server every 5 s (it schedules the next spawn).
    interval(1000).pipe(takeUntilDestroyed(inject(DestroyRef))).subscribe(n => {
      this.now.set(Date.now());
      if (n % 5 === 4) this.load();
    });
  }

  protected toggle(): void {
    const sim = this.simulation();
    if (sim) this.update({ enabled: !sim.enabled });
  }

  protected setSpawnInterval(seconds: number): void {
    this.update({ intervalSeconds: seconds });
  }

  protected spawn(): void {
    this.busy.set(true);
    this.error.set(null);
    this.feed.introduce(this.target() || undefined).subscribe({
      next: result => {
        this.busy.set(false);
        this.spawned.emit(result);
        this.load();
      },
      error: err => {
        this.busy.set(false);
        this.error.set(toErrorMessage(err, 'Failed to introduce paradox.'));
      },
    });
  }

  private load(): void {
    this.api.getSimulation().subscribe({
      next: sim => this.simulation.set(sim),
      error: () => this.simulation.set(null),
    });
  }

  private update(cmd: { enabled?: boolean; intervalSeconds?: number }): void {
    this.error.set(null);
    this.api.updateSimulation(cmd).subscribe({
      next: sim => this.simulation.set(sim),
      error: err => this.error.set(toErrorMessage(err, 'Could not update the simulation.')),
    });
  }
}
