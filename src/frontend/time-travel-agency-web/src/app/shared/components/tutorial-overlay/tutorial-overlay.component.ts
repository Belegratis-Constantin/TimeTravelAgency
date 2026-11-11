import { ChangeDetectionStrategy, Component, output, signal } from '@angular/core';

interface RoleChip {
  icon: string;
  name: string;
  mono: string;
  desc: string;
}

@Component({
  selector: 'app-tutorial-overlay',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'dismiss()' },
  templateUrl: './tutorial-overlay.component.html',
  styleUrl: './tutorial-overlay.component.css',
})
export class TutorialOverlayComponent {
  readonly dismissed = output<void>();

  readonly step = signal(1);
  readonly totalSteps = 5;
  protected readonly steps = [1, 2, 3, 4, 5];
  /** Era beacons on the step-4 illustration. */
  protected readonly beacons = [
    { label: 'ANCIENT', x: 120, y: 82, color: '#D4A017', delay: 0 },
    { label: 'INDUSTRIAL', x: 270, y: 108, color: '#B08968', delay: 0.8 },
    { label: 'FUTURE', x: 400, y: 82, color: '#B5179E', delay: 1.6 },
  ];
  readonly activeRoleChip = signal(0);

  readonly Math = Math;

  readonly clockTicks: number[] = Array.from({ length: 12 }, (_, i) =>
    (i / 12) * Math.PI * 2 - Math.PI / 2
  );

  readonly roleChips: RoleChip[] = [
    {
      icon: '◉',
      name: 'Customer',
      mono: 'TRAVELLER',
      desc: 'Browse all eras, book passage through history, and track your journeys on the My Journeys page. Pick or create a traveller identity first.',
    },
    {
      icon: '✒',
      name: 'Agent',
      mono: 'FIELD OPS',
      desc: 'Licensed and support agents see their missions, get alerted when a paradox hits one of them, and file field reports — the Agency\'s eyes and ears across the timeline.',
    },
    {
      icon: '⬡',
      name: 'Manager',
      mono: 'OVERSIGHT',
      desc: 'Create trips, recruit agents, grant licences and assign support agents. Paradoxes appear on your trips at runtime — work them in the Paradox Log before a trip turns critical.',
    },
    {
      icon: '✦',
      name: 'Director',
      mono: 'COMMAND',
      desc: 'The Command Centre: live system-wide figures, appoint managers and audit every agent in the field. The top of the hierarchy.',
    },
    {
      icon: '⧗',
      name: 'Time Itself',
      mono: 'OMNISCIENT',
      desc: 'Enter The Loom — a living map of every timeline. Time tears paradoxes into trips on its own; here you pause or speed up that process and trigger fractures manually for testing.',
    },
  ];

  onBackdropClick(e: MouseEvent): void {
    if (e.target === e.currentTarget) this.dismiss();
  }

  next(): void {
    if (this.step() < this.totalSteps) this.step.update(s => s + 1);
    else this.dismiss();
  }

  back(): void {
    if (this.step() > 1) this.step.update(s => s - 1);
  }

  goTo(n: number): void { this.step.set(n); }

  dismiss(): void { this.dismissed.emit(); }

  selectRoleChip(i: number): void { this.activeRoleChip.set(i); }
}
