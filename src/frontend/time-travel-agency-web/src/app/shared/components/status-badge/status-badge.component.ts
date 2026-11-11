import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { paradoxMeta, StatusMeta, tripStatusMeta, tripTypeMeta } from '../../utils/status.utils';

export type BadgeKind = 'trip' | 'tripType' | 'paradox';

@Component({
  selector: 'app-status-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="badge" [class]="'badge--' + meta().tone">{{ meta().label }}</span>`,
})
export class StatusBadgeComponent {
  readonly status = input.required<string>();
  readonly kind = input<BadgeKind>('trip');

  protected readonly meta = computed((): StatusMeta => {
    switch (this.kind()) {
      case 'paradox': return paradoxMeta(this.status());
      case 'tripType': return tripTypeMeta(this.status());
      default: return tripStatusMeta(this.status());
    }
  });
}
