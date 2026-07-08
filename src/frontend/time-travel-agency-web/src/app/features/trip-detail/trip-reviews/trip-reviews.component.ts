import { Component, Input } from '@angular/core';
import { ReviewDto } from '../../../core/models/trip.model';
import { starString } from '../../../shared/utils/status.utils';

@Component({
  selector: 'app-trip-reviews',
  standalone: true,
  template: `
    <div style="margin-bottom:44px;">
      <div style="font-family:'Fraunces',serif;font-size:20px;margin-bottom:18px;">Reviews</div>

      @if (reviews.length > 0) {
        <div style="display:flex;flex-direction:column;gap:16px;">
          @for (review of reviews; track review.guid) {
            <div style="background:#1E2A3A;border-radius:4px;padding:18px 22px;">
              <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
                <span style="font-size:13.5px;font-weight:600;">{{ review.header }}</span>
                <span style="color:#C9A84C;font-size:13px;letter-spacing:1px;">{{ stars(review.stars) }}</span>
              </div>
              <div style="font-size:13.5px;color:#B7BFCC;line-height:1.6;">{{ review.content }}</div>
            </div>
          }
        </div>
      } @else {
        <div style="color:#6B7488;font-size:13.5px;font-style:italic;">No reviews yet.</div>
      }
    </div>
  `,
})
export class TripReviewsComponent {
  @Input() reviews: ReviewDto[] = [];

  stars(n: number): string {
    return starString(n);
  }
}
