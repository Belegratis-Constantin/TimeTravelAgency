import {
  AfterViewInit, ChangeDetectionStrategy, Component, computed, DestroyRef, effect, ElementRef, inject, OnDestroy, signal, viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DecimalPipe, SlicePipe } from '@angular/common';
import { interval } from 'rxjs';
import { TripDto } from '../../core/models/trip.model';
import { ParadoxFeedDto, SpawnParadoxResultDto } from '../../core/models/paradox.model';
import { AgencyStore } from '../../state/agency.store';
import { ParadoxFeedStore } from '../../state/paradox-feed.store';
import { PARADOX_TYPES, paradoxTypeColor, paradoxTypeLabel } from '../../shared/utils/status.utils';
import { SimulationPanelComponent } from './simulation-panel/simulation-panel.component';

interface TripNode {
  trip: TripDto;
  x: number;
  y: number;
  t: number; // 0-1 position along bezier
}

interface Branch {
  paradox: ParadoxFeedDto;
  tripNode: TripNode;
  lane: number;
  dir: 1 | -1;
  color: string;
  healed: boolean;
  healProgress: number; // 0-1
  id: string;
}

function cubicBezier(p0: [number, number], p1: [number, number], p2: [number, number], p3: [number, number], t: number): [number, number] {
  const mt = 1 - t;
  return [
    mt * mt * mt * p0[0] + 3 * mt * mt * t * p1[0] + 3 * mt * t * t * p2[0] + t * t * t * p3[0],
    mt * mt * mt * p0[1] + 3 * mt * mt * t * p1[1] + 3 * mt * t * t * p2[1] + t * t * t * p3[1],
  ];
}

@Component({
  selector: 'app-loom',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe, SlicePipe, SimulationPanelComponent],
  templateUrl: './loom.component.html',
  styleUrl: './loom.component.css',
})
export class LoomComponent implements AfterViewInit, OnDestroy {
  private readonly starCanvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('starCanvas');
  private readonly sparkCanvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('sparkCanvas');

  protected readonly agency = inject(AgencyStore);
  private readonly feed = inject(ParadoxFeedStore);

  readonly W = 1600;
  readonly H = 900;

  private previousStatuses = new Map<string, string>();
  private starRafId: number | null = null;
  private readonly onResize = () => this.resizeStarCanvas();

  readonly plasmaSeed = signal(1);
  readonly plasmaFreq = signal('0.018 0.025');

  // Prime bezier control points
  private P0: [number, number] = [80, 450];
  private P1: [number, number] = [480, 200];
  private P2: [number, number] = [1120, 700];
  private P3: [number, number] = [1280, 450];

  readonly primePath = computed(() => {
    const [x0, y0] = this.P0, [x1, y1] = this.P1, [x2, y2] = this.P2, [x3, y3] = this.P3;
    return `M ${x0} ${y0} C ${x1} ${y1} ${x2} ${y2} ${x3} ${y3}`;
  });

  readonly tripNodes = computed((): TripNode[] => {
    const ts = this.agency.trips();
    if (!ts.length) return [];
    return ts.map((trip, i) => {
      const t = 0.12 + (i / Math.max(ts.length - 1, 1)) * 0.76;
      const [x, y] = cubicBezier(this.P0, this.P1, this.P2, this.P3, t);
      return { trip, x, y, t };
    });
  });

  readonly branches = signal<Branch[]>([]);

  readonly integrity = computed(() => {
    const bs = this.branches();
    if (!bs.length) return 100;
    const active = bs.filter(b => !b.healed).length;
    return Math.max(0, Math.round(100 - (active / bs.length) * 80));
  });

  readonly openParadoxes = computed(() => this.branches().filter(b => !b.healed).length);

  readonly integrityColor = computed(() => {
    const v = this.integrity();
    if (v > 70) return '#4EB87A';
    if (v > 40) return '#C9A84C';
    return '#E05A4E';
  });

  private readonly selectedGuid = signal<string | null>(null);
  readonly selectedTrip = computed(() => {
    const guid = this.selectedGuid();
    return guid ? this.agency.tripsByGuid().get(guid) ?? null : null;
  });
  readonly selectedTripParadoxes = computed(() => {
    const t = this.selectedTrip();
    return t ? this.branches().filter(b => b.tripNode.trip.guid === t.guid) : [];
  });

  readonly paradoxLegend = PARADOX_TYPES.map(type => ({ type, label: paradoxTypeLabel(type), color: paradoxTypeColor(type) }));
  protected readonly typeLabel = paradoxTypeLabel;

  constructor() {
    // Rebuild branches whenever the live feed or the trip layout changes.
    effect(() => this.updateBranches(this.feed.paradoxes(), this.tripNodes()));

    // Animate the plasma turbulence seed.
    interval(120)
      .pipe(takeUntilDestroyed(inject(DestroyRef)))
      .subscribe(() => this.plasmaSeed.update(seed => (seed % 9999) + 1));
  }

  ngAfterViewInit(): void {
    this.initStarfield();
  }

  ngOnDestroy(): void {
    if (this.starRafId) cancelAnimationFrame(this.starRafId);
    window.removeEventListener('resize', this.onResize);
  }

  selectTrip(trip: TripDto): void {
    this.selectedGuid.set(trip.guid);
  }

  protected onSpawned(result: SpawnParadoxResultDto): void {
    this.sparkAt(result.paradox.tripGuid);
  }

  private updateBranches(paradoxes: ParadoxFeedDto[], nodes: TripNode[]): void {
    const nodeByTrip = new Map(nodes.map(n => [n.trip.guid, n]));
    const laneCounters = new Map<string, number>();
    const newBranches: Branch[] = [];

    // Oldest first so lanes stay stable as new paradoxes arrive.
    for (const p of [...paradoxes].reverse()) {
      const node = nodeByTrip.get(p.tripGuid);
      if (!node) continue;

      const prevStatus = this.previousStatuses.get(p.guid);
      const isHealed = p.paradoxStatus === 'Solved';
      if (isHealed && prevStatus !== undefined && prevStatus !== 'Solved') this.animateHeal(p.guid);
      this.previousStatuses.set(p.guid, p.paradoxStatus);

      const count = laneCounters.get(p.tripGuid) ?? 0;
      laneCounters.set(p.tripGuid, count + 1);

      newBranches.push({
        paradox: p,
        tripNode: node,
        lane: Math.floor(count / 2) + 1,
        dir: count % 2 === 0 ? 1 : -1,
        color: paradoxTypeColor(p.paradoxType),
        healed: isHealed,
        healProgress: isHealed ? 1 : 0,
        id: p.guid,
      });
    }

    this.branches.set(newBranches);
  }

  private animateHeal(paradoxGuid: string): void {
    const startTime = performance.now();
    const duration = 1200;

    const step = (now: number) => {
      const p = Math.min((now - startTime) / duration, 1);
      this.branches.update(bs => bs.map(b => (b.id === paradoxGuid ? { ...b, healProgress: p, healed: true } : b)));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  branchPath(b: Branch): string {
    const { x, y } = b.tripNode;
    const spread = 80 * b.lane * b.dir;
    const len = 90 + b.lane * 20;
    const hp = b.healed ? b.healProgress : 1;

    if (b.healed) {
      // Converge back
      const endX = x + spread * (1 - hp);
      const endY = y + len * b.dir * (1 - hp);
      return `M ${x} ${y} Q ${x + spread * 0.5 * (1 - hp)} ${y + len * b.dir * (1 - hp) * 0.5} ${endX} ${endY}`;
    }

    const cx1 = x + spread * 0.4;
    const cy1 = y + len * b.dir * 0.3;
    const cx2 = x + spread * 0.7;
    const cy2 = y + len * b.dir * 0.7;
    return `M ${x} ${y} C ${cx1} ${cy1} ${cx2} ${cy2} ${x + spread} ${y + len * b.dir}`;
  }

  private sparkAt(tripGuid: string): void {
    const node = this.tripNodes().find(n => n.trip.guid === tripGuid);
    if (!node) return;

    const canvas = this.sparkCanvasRef().nativeElement;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // The SVG uses "xMidYMid meet": compute the same uniform scale and letterbox offset.
    const scale = Math.min(rect.width / this.W, rect.height / this.H);
    const cx = (rect.width - this.W * scale) / 2 + node.x * scale;
    const cy = (rect.height - this.H * scale) / 2 + node.y * scale;

    interface Spark { x: number; y: number; vx: number; vy: number; life: number; color: string }
    const sparks: Spark[] = Array.from({ length: 40 }, () => {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 5;
      return { x: cx, y: cy, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 1, color: `hsl(${Math.random() * 40},100%,70%)` };
    });

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;
      for (const s of sparks) {
        if (s.life <= 0) continue;
        alive = true;
        s.x += s.vx; s.y += s.vy; s.vy += 0.1; s.life -= 0.025;
        ctx.globalAlpha = s.life;
        ctx.fillStyle = s.color;
        ctx.shadowColor = s.color;
        ctx.shadowBlur = 6;
        ctx.fillRect(s.x - 1, s.y - 1, 3, 3);
      }
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
      if (alive) requestAnimationFrame(animate);
      else ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
    requestAnimationFrame(animate);
  }

  private resizeStarCanvas(): void {
    const canvas = this.starCanvasRef().nativeElement;
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
  }

  private initStarfield(): void {
    const canvas = this.starCanvasRef().nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    this.resizeStarCanvas();
    window.addEventListener('resize', this.onResize);

    interface Star { x: number; y: number; r: number; a: number; da: number; layer: number }
    const stars: Star[] = Array.from({ length: 220 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.2 + 0.2,
      a: Math.random(),
      da: (Math.random() - 0.5) * 0.005,
      layer: Math.floor(Math.random() * 3),
    }));

    interface Comet { x: number; y: number; vx: number; vy: number; life: number }
    const comets: Comet[] = [];

    const drawFrame = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const s of stars) {
        s.a = Math.max(0.05, Math.min(1, s.a + s.da));
        if (s.a <= 0.06 || s.a >= 0.99) s.da *= -1;
        ctx.globalAlpha = s.a * (0.4 + s.layer * 0.2);
        ctx.fillStyle = '#F0EDE6';
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }

      if (Math.random() < 0.004) {
        comets.push({ x: Math.random() * canvas.width, y: Math.random() * canvas.height * 0.5,
                      vx: 4 + Math.random() * 6, vy: 1 + Math.random() * 2, life: 1 });
      }
      for (let i = comets.length - 1; i >= 0; i--) {
        const c = comets[i];
        c.x += c.vx; c.y += c.vy; c.life -= 0.015;
        if (c.life <= 0) { comets.splice(i, 1); continue; }
        ctx.globalAlpha = c.life * 0.6;
        const grad = ctx.createLinearGradient(c.x - c.vx * 8, c.y - c.vy * 8, c.x, c.y);
        grad.addColorStop(0, 'transparent');
        grad.addColorStop(1, '#F0EDE6');
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(c.x - c.vx * 8, c.y - c.vy * 8);
        ctx.lineTo(c.x, c.y);
        ctx.stroke();
      }

      ctx.globalAlpha = 1;
      this.starRafId = requestAnimationFrame(drawFrame);
    };
    drawFrame();
  }
}
