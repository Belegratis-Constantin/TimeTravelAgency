import { Component, Input } from '@angular/core';
import { formatDateTime } from '../../../shared/utils/date.utils';
import { CustomerDto } from '../../../core/models/trip.model';
import { initials } from '../../../shared/utils/status.utils';

@Component({
  selector: 'app-trip-staff',
  standalone: true,
  template: `
    <!-- Staff panel -->
    <div style="background:#1E2A3A;border-radius:4px;padding:24px;margin-bottom:24px;">
      <div style="font-size:11px;color:#6B7488;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:16px;">
        Staff
      </div>
      <div style="display:flex;flex-direction:column;gap:12px;font-size:13.5px;">
        <div style="display:flex;justify-content:space-between;">
          <span style="color:#8A93A6;">Licensed Agent</span>
          <span>{{ licensedAgentName }}</span>
        </div>
        @if (supportAgentName) {
          <div style="display:flex;justify-content:space-between;">
            <span style="color:#8A93A6;">Support Agent</span>
            <span>{{ supportAgentName }}</span>
          </div>
        }
        <div style="display:flex;justify-content:space-between;">
          <span style="color:#8A93A6;">Departs</span>
          <span>{{ formatDate(dateInRealLife) }}</span>
        </div>
      </div>
    </div>

    <!-- Customers panel -->
    <div style="background:#1E2A3A;border-radius:4px;padding:24px;margin-bottom:24px;">
      <div style="font-size:11px;color:#6B7488;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:16px;">
        Booked Customers · {{ customers.length }}
      </div>
      <div style="display:flex;flex-direction:column;gap:12px;">
        @for (c of customers; track c.guid) {
          <div style="display:flex;align-items:center;gap:12px;">
            <div style="width:32px;height:32px;border-radius:50%;background:#2A3A50;color:#C9A84C;
                        display:flex;align-items:center;justify-content:center;
                        font-size:12px;font-weight:600;flex-shrink:0;">
              {{ customerInitials(c) }}
            </div>
            <span style="font-size:13.5px;">{{ c.firstname }} {{ c.lastname }}</span>
          </div>
        }
        @if (customers.length === 0) {
          <div style="color:#6B7488;font-size:13px;font-style:italic;">No travelers booked yet.</div>
        }
      </div>
    </div>
  `,
})
export class TripStaffComponent {
  @Input() licensedAgentName = '';
  @Input() supportAgentName: string | null = null;
  @Input() dateInRealLife = '';
  @Input() customers: CustomerDto[] = [];

  formatDate(iso: string): string {
    return iso ? formatDateTime(iso) : '';
  }

  customerInitials(c: CustomerDto): string {
    return initials(c.firstname, c.lastname);
  }
}
