import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ReviewDto } from '../../../core/models/trip.model';
import { starString } from '../../../shared/utils/status.utils';

@Component({
  selector: 'app-trip-reviews',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="section">
      <h2 class="section-title">Reviews</h2>
      @for (review of reviews(); track review.guid) {
        <article class="card review">
          <div class="row row--between">
            <strong>{{ review.header }}</strong>
            <span class="stars" [attr.aria-label]="review.stars + ' of 5 stars'">{{ stars(review.stars) }}</span>
          </div>
          @if (review.content) { <p>{{ review.content }}</p> }
        </article>
      } @empty {
        <p class="empty-hint">No reviews yet.</p>
      }
    </section>
  `,
  styles: `
    .review { padding: 14px 16px; margin-bottom: 8px; }
    .review p { margin: 6px 0 0; font-size: 13.5px; color: var(--text-2); line-height: 1.6; max-width: 70ch; }
    .stars { color: var(--amber); letter-spacing: 1px; font-size: 13px; }
  `,
})
export class TripReviewsComponent {
  readonly reviews = input.required<ReviewDto[]>();
  protected readonly stars = starString;
}
