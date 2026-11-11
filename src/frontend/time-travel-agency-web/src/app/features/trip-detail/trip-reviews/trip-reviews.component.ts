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
    .review { padding: 18px 22px; margin-bottom: 12px; }
    .review p { margin: 8px 0 0; font-size: 13.5px; color: var(--text-2); line-height: 1.6; }
    .stars { color: var(--gold); letter-spacing: 1px; }
  `,
})
export class TripReviewsComponent {
  readonly reviews = input.required<ReviewDto[]>();
  protected readonly stars = starString;
}
