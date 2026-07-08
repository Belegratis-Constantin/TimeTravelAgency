import { Component, Input } from '@angular/core';
import { formatDateTime } from '../../../shared/utils/date.utils';

@Component({
  selector: 'app-trip-timeline',
  standalone: true,
  template: `
    <div style="background:#1E2A3A;border-radius:4px;padding:32px 40px 24px;margin-bottom:44px;">
      <div style="font-size:11px;color:#6B7488;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:24px;">
        Departure Date
      </div>
      <div style="position:relative;height:2px;background:#2E3E54;margin:0 4px;">
        <div style="position:absolute;left:0%;top:-4px;width:2px;height:10px;background:#3E4E64;"></div>
        <div style="position:absolute;left:25%;top:-4px;width:2px;height:10px;background:#3E4E64;"></div>
        <div style="position:absolute;left:50%;top:-4px;width:2px;height:10px;background:#3E4E64;"></div>
        <div style="position:absolute;left:75%;top:-4px;width:2px;height:10px;background:#3E4E64;"></div>
        <div style="position:absolute;left:100%;top:-4px;width:2px;height:10px;background:#3E4E64;transform:translateX(-2px);"></div>
        <div style="position:absolute;left:95%;top:-7px;width:14px;height:14px;border-radius:50%;
                    background:#C9A84C;box-shadow:0 0 0 4px rgba(201,168,76,0.22);transform:translateX(-7px);">
        </div>
      </div>
      <div style="display:flex;justify-content:space-between;margin-top:10px;
                  font-family:'IBM Plex Mono',monospace;font-size:10.5px;color:#6B7488;">
        <span>Past</span>
        <span style="color:#C9A84C;">{{ formattedDate }}</span>
        <span>Future</span>
      </div>
    </div>
  `,
})
export class TripTimelineComponent {
  @Input() dateInRealLife = '';

  get formattedDate(): string {
    return this.dateInRealLife ? formatDateTime(this.dateInRealLife) : '';
  }
}
