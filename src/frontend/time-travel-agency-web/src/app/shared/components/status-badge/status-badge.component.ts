import { Component, Input } from '@angular/core';
import { tripStatusMeta, paradoxMeta, StatusMeta } from '../../utils/status.utils';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  template: `
    <span [style.background]="meta.bg" [style.color]="meta.color"
          style="font-size:11px;font-weight:600;padding:4px 10px;border-radius:20px;white-space:nowrap;display:inline-block;">
      {{ meta.label }}
    </span>
  `,
})
export class StatusBadgeComponent {
  @Input() status = '';
  @Input() type: 'trip' | 'paradox' = 'trip';

  get meta(): StatusMeta {
    return this.type === 'paradox' ? paradoxMeta(this.status) : tripStatusMeta(this.status);
  }
}
