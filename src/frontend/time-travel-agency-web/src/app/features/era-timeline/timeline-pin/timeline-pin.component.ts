import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { formatDateOnly } from '../../../shared/utils/date.utils';
import { tripDisplayName } from '../../../shared/utils/status.utils';
import { formatYear, PHASE_COLORS, PHASE_LABELS, SPINE_PCT, TripPin } from '../era-timeline.config';

/** One trip beacon on the Continuum spine, with its hover readout. */
@Component({
  selector: 'app-timeline-pin',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './timeline-pin.component.html',
  styleUrl: './timeline-pin.component.css',
  host: {
    '[style.left.px]': 'pin().x - 11',
    '[style.top.%]': 'spinePct',
    '[style.margin-top.px]': '-(pin().stemHeight + 22)',
    '[style.--accent]': 'pin().zone.accent',
    '[class.dimmed]': 'dimmed()',
    '[class.selected]': 'selected()',
    '(click)': 'onClick($event)',
    '(mouseenter)': 'hovered.set(true)',
    '(mouseleave)': 'hovered.set(false)',
  },
})
export class TimelinePinComponent {
  readonly pin = input.required<TripPin>();
  readonly selected = input(false);
  readonly dimmed = input(false);
  readonly picked = output<void>();

  protected readonly hovered = signal(false);
  protected readonly spinePct = SPINE_PCT;
  protected readonly phaseColors = PHASE_COLORS;
  protected readonly phaseLabels = PHASE_LABELS;
  protected readonly bars = [1, 2, 3];
  protected readonly formatYear = formatYear;
  protected readonly formatDate = formatDateOnly;
  protected readonly tripName = tripDisplayName;

  protected onClick(event: MouseEvent): void {
    event.stopPropagation();
    this.picked.emit();
  }
}
