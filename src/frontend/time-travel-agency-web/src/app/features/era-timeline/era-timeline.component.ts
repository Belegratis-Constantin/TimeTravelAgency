import {
  AfterViewInit, ChangeDetectionStrategy, Component, computed, effect, ElementRef, inject, OnDestroy, signal, untracked, viewChild,
} from '@angular/core';
import { AgencyStore } from '../../state/agency.store';
import { ParadoxFeedStore } from '../../state/paradox-feed.store';
import { BoardingCardComponent } from './boarding-card/boarding-card.component';
import { TimelinePinComponent } from './timeline-pin/timeline-pin.component';
import { TimelineScrubberComponent } from './timeline-scrubber/timeline-scrubber.component';
import {
  ERA_ZONES, EraZone, formatYear, riskLevel, SPINE_PCT, TOTAL_W, TripPin, tripDestYear, yearToPx, ZONE_W, zoneForPx,
} from './era-timeline.config';

const MIN_PIN_GAP = 34;
const YEAR_TICKS = [
  { year: -65_000_000, label: '65M BC' },
  { year: -3_000, label: '3000 BC' },
  { year: -44, label: '44 BC' },
  { year: 1066, label: '1066' },
  { year: 1492, label: '1492' },
  { year: 1776, label: '1776' },
  { year: 1945, label: '1945' },
  { year: 2050, label: '2050' },
  { year: 2500, label: '2500' },
];

/** "The Continuum": every trip placed on a scrollable timeline of eras (destination = licensed agent's epoch). */
@Component({
  selector: 'app-era-timeline',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TimelinePinComponent, TimelineScrubberComponent, BoardingCardComponent],
  templateUrl: './era-timeline.component.html',
  styleUrl: './era-timeline.component.css',
})
export class EraTimelineComponent implements AfterViewInit, OnDestroy {
  private readonly agency = inject(AgencyStore);
  private readonly feed = inject(ParadoxFeedStore);

  private readonly scrollEl = viewChild<ElementRef<HTMLElement>>('scrollEl');
  private readonly starCanvas = viewChild<ElementRef<HTMLCanvasElement>>('starCanvas');
  private rafId: number | null = null;
  private resizeHandler: (() => void) | null = null;

  protected readonly loading = this.agency.initialLoading;
  protected readonly scrollX = signal(0);
  protected readonly selectedTripGuid = signal<string | null>(null);

  protected readonly eraZones = ERA_ZONES;
  protected readonly zoneWidth = ZONE_W;
  protected readonly totalWidth = TOTAL_W;
  protected readonly spinePct = SPINE_PCT;
  protected readonly formatYear = formatYear;

  protected readonly pins = computed((): TripPin[] => {
    const agents = this.agency.agentsById();
    const pins = this.agency.trips().map((trip, i): TripPin => {
      const year = tripDestYear(trip, agents);
      const x = yearToPx(year);
      const stemHeight = 28 + (i % 4) * 18;
      return {
        trip, year, x, stemHeight,
        zone: zoneForPx(x),
        isCritical: trip.tripType === 'CriticalTrip',
        risk: riskLevel(this.feed.openCountForTrip(trip.guid)),
        signalBars: stemHeight <= 46 ? 1 : stemHeight <= 64 ? 2 : 3,
      };
    });

    // Spread pins that are too close on the x-axis so they don't overlap
    const sorted = [...pins].sort((a, b) => a.x - b.x);
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].x - sorted[i - 1].x < MIN_PIN_GAP) {
        sorted[i].x = sorted[i - 1].x + MIN_PIN_GAP;
        sorted[i].zone = zoneForPx(sorted[i].x);
      }
    }
    return pins;
  });

  protected readonly yearTicks = YEAR_TICKS
    .filter(t => t.year >= ERA_ZONES[0].startYear && t.year <= ERA_ZONES[ERA_ZONES.length - 1].endYear)
    .map(t => ({ px: yearToPx(t.year), label: t.label, accent: zoneForPx(yearToPx(t.year)).accent }));

  private readonly viewportCentre = computed(() => Math.max(0, this.scrollX() + viewportWidth() / 2));
  protected readonly activeZone = computed((): EraZone => zoneForPx(this.viewportCentre()));
  protected readonly currentYear = computed((): number => {
    const zone = this.activeZone();
    const t = (this.viewportCentre() - zone.pxStart) / ZONE_W;
    return Math.round(zone.startYear + t * (zone.endYear - zone.startYear));
  });
  protected readonly scrubberLeft = computed(() => (this.scrollX() / TOTAL_W) * 100);
  protected readonly scrubberWidth = (viewportWidth() / TOTAL_W) * 100;

  protected readonly selectedPin = computed(() => this.pins().find(p => p.trip.guid === this.selectedTripGuid()) ?? null);

  constructor() {
    this.agency.ensureLoaded();

    // Centre the view on the first pins once, as soon as trips are available.
    let centred = false;
    effect(() => {
      if (centred || this.pins().length === 0) return;
      centred = true;
      untracked(() => setTimeout(() => this.scrollToFirstPin(), 80));
    });
  }

  ngAfterViewInit(): void {
    this.initStarfield();
  }

  ngOnDestroy(): void {
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    if (this.resizeHandler) window.removeEventListener('resize', this.resizeHandler);
  }

  protected onScroll(event: Event): void {
    this.scrollX.set((event.target as HTMLElement).scrollLeft);
  }

  protected jumpToZone(zone: EraZone): void {
    const el = this.scrollEl()?.nativeElement;
    el?.scrollTo({ left: Math.max(0, zone.pxStart + ZONE_W / 2 - el.clientWidth / 2), behavior: 'smooth' });
  }

  protected seekTo(fraction: number): void {
    this.scrollEl()?.nativeElement.scrollTo({ left: fraction * TOTAL_W, behavior: 'smooth' });
  }

  protected selectPin(pin: TripPin): void {
    if (this.selectedTripGuid() === pin.trip.guid) {
      this.closeCard();
      return;
    }
    this.selectedTripGuid.set(pin.trip.guid);
    const el = this.scrollEl()?.nativeElement;
    el?.scrollTo({ left: Math.max(0, pin.x - el.clientWidth * 0.3), behavior: 'smooth' });
  }

  protected closeCard(): void {
    this.selectedTripGuid.set(null);
  }

  private scrollToFirstPin(): void {
    const el = this.scrollEl()?.nativeElement;
    if (!el || this.pins().length === 0) return;
    const target = [...this.pins()].sort((a, b) => Math.abs(a.year - 1500) - Math.abs(b.year - 1500))[0];
    el.scrollTo({ left: Math.max(0, target.x - el.clientWidth / 2), behavior: 'smooth' });
  }

  private initStarfield(): void {
    const canvasEl = this.starCanvas()?.nativeElement;
    if (!canvasEl) return;

    const resize = () => {
      canvasEl.width = canvasEl.offsetWidth;
      canvasEl.height = canvasEl.offsetHeight;
    };
    resize();
    this.resizeHandler = resize;
    window.addEventListener('resize', resize);

    const ctx = canvasEl.getContext('2d')!;
    const DEPTHS = [0.12, 0.32, 0.62];

    interface Star { x: number; y: number; r: number; a: number; da: number; layer: number }
    const W = () => canvasEl.width;
    const H = () => canvasEl.height;

    const stars: Star[] = Array.from({ length: 260 }, () => {
      const layer = Math.floor(Math.random() * 3);
      return {
        x: Math.random() * (W() + 200),
        y: Math.random() * H(),
        r: 0.2 + Math.random() * (1 + layer * 0.3),
        a: Math.random(),
        da: (Math.random() - 0.5) * 0.004,
        layer,
      };
    });

    interface Comet { x: number; y: number; vx: number; vy: number; life: number }
    const comets: Comet[] = [];

    const drawFrame = () => {
      const sx = this.scrollX();
      const w = W(), h = H();
      ctx.clearRect(0, 0, w, h);

      // Nebula blobs
      ERA_ZONES.forEach((zone, zi) => {
        const blobCx = (zone.pxStart + ZONE_W / 2 - sx * 0.25);
        if (blobCx < -600 || blobCx > w + 600) return;
        const grad = ctx.createRadialGradient(blobCx, h * 0.62, 0, blobCx, h * 0.62, 520);
        grad.addColorStop(0, zone.accent + '10');
        grad.addColorStop(1, 'transparent');
        ctx.globalAlpha = 0.55;
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
      });
      ctx.globalAlpha = 1;

      // Stars with parallax
      for (const s of stars) {
        s.a = Math.max(0.05, Math.min(1, s.a + s.da));
        if (s.a <= 0.06 || s.a >= 0.99) s.da *= -1;
        const px = ((s.x - sx * DEPTHS[s.layer]) % (w + 200) + w + 200) % (w + 200) - 100;
        ctx.globalAlpha = s.a * (0.3 + s.layer * 0.25);
        ctx.fillStyle = '#E8EDF4';
        ctx.beginPath();
        ctx.arc(px, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // Shooting comets
      if (Math.random() < 0.003) {
        comets.push({ x: Math.random() * w, y: Math.random() * h * 0.4, vx: 5 + Math.random() * 7, vy: 1 + Math.random() * 1.5, life: 1 });
      }
      for (let i = comets.length - 1; i >= 0; i--) {
        const c = comets[i];
        c.x += c.vx; c.y += c.vy; c.life -= 0.02;
        if (c.life <= 0) { comets.splice(i, 1); continue; }
        ctx.globalAlpha = c.life * 0.5;
        const grad = ctx.createLinearGradient(c.x - c.vx * 10, c.y - c.vy * 10, c.x, c.y);
        grad.addColorStop(0, 'transparent');
        grad.addColorStop(1, '#E8EDF4');
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(c.x - c.vx * 10, c.y - c.vy * 10);
        ctx.lineTo(c.x, c.y);
        ctx.stroke();
      }

      ctx.globalAlpha = 1;
      this.rafId = requestAnimationFrame(drawFrame);
    };
    drawFrame();
  }

}

function viewportWidth(): number {
  return typeof window !== 'undefined' ? window.innerWidth : 1200;
}
