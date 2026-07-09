import {
  Component, OnInit, OnDestroy, ElementRef, ViewChild, inject, signal, DestroyRef, computed, AfterViewInit
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { DecimalPipe, SlicePipe } from '@angular/common';
import { timer } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { TripService } from '../../core/services/trip.service';
import { ParadoxService } from '../../core/services/paradox.service';
import { TripDto, ParadoxDto } from '../../core/models/trip.model';

interface TripNode {
  trip: TripDto;
  x: number;
  y: number;
  t: number; // 0-1 position along bezier
}

interface Branch {
  paradox: ParadoxDto;
  tripNode: TripNode;
  lane: number;
  dir: 1 | -1;
  color: string;
  healed: boolean;
  healProgress: number; // 0-1
  id: string;
}

const PARADOX_COLORS: Record<string, string> = {
  GrandFatherParadox: '#E05A4E',
  BootstrapParadox: '#C9A84C',
  PredestinationParadox: '#7B5EA7',
  CausalLoop: '#3B9EBF',
  TemporalFlux: '#4EB87A',
  Unknown: '#6B7488',
};

function paradoxColor(type: string): string {
  return PARADOX_COLORS[type] ?? PARADOX_COLORS['Unknown'];
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
  standalone: true,
  imports: [FormsModule, DecimalPipe, SlicePipe],
  styles: [`
    :host { display:block; }
    @keyframes drift { from { transform:translateY(0) } to { transform:translateY(-4px) } }
    @keyframes pulse-orb { 0%,100% { r:10; opacity:0.9 } 50% { r:14; opacity:1 } }
    @keyframes halo-pulse { 0%,100% { r:22; opacity:0.3 } 50% { r:28; opacity:0.1 } }
    @keyframes comet { 0% { stroke-dashoffset:1000 } 100% { stroke-dashoffset:0 } }
    @keyframes integrity-flash { 0%,100% { opacity:1 } 50% { opacity:0.4 } }
  `],
  template: `
    <div style="position:relative;width:100vw;height:100vh;background:#020408;overflow:hidden;font-family:'Courier New',monospace;">

      <!-- Starfield canvas -->
      <canvas #starCanvas style="position:absolute;inset:0;pointer-events:none;"></canvas>

      <!-- SVG Timeline -->
      <svg #svgLoom style="position:absolute;inset:0;width:100%;height:100%;"
           [attr.viewBox]="'0 0 ' + W + ' ' + H" preserveAspectRatio="xMidYMid meet">
        <defs>
          <!-- Plasma filter -->
          <filter id="plasma" x="-50%" y="-50%" width="200%" height="200%">
            <feTurbulence type="fractalNoise" [attr.baseFrequency]="plasmaFreq()"
                         numOctaves="4" [attr.seed]="plasmaSeed()" result="noise"/>
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="6" xChannelSelector="R" yChannelSelector="G"/>
          </filter>
          <!-- Glow filters -->
          <filter id="glow-gold">
            <feGaussianBlur stdDeviation="6" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id="glow-red">
            <feGaussianBlur stdDeviation="8" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id="glow-heal">
            <feGaussianBlur stdDeviation="10" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <!-- Radial gradient for orbs -->
          <radialGradient id="orb-grad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#F0EDE6" stop-opacity="1"/>
            <stop offset="60%" stop-color="#C9A84C" stop-opacity="0.8"/>
            <stop offset="100%" stop-color="#C9A84C" stop-opacity="0"/>
          </radialGradient>
        </defs>

        <!-- Prime strand outer glow layers -->
        <path [attr.d]="primePath()" fill="none" stroke="rgba(201,168,76,0.08)" stroke-width="24" stroke-linecap="round"/>
        <path [attr.d]="primePath()" fill="none" stroke="rgba(201,168,76,0.18)" stroke-width="10" stroke-linecap="round"/>
        <!-- Prime strand core -->
        <path [attr.d]="primePath()" fill="none" stroke="#C9A84C" stroke-width="2.5"
              stroke-linecap="round" filter="url(#glow-gold)"/>

        <!-- Paradox branches -->
        @for (b of branches(); track b.id) {
          <g [attr.filter]="b.healed ? 'url(#glow-heal)' : 'url(#plasma)'">
            <path [attr.d]="branchPath(b)" fill="none"
                  [attr.stroke]="b.healed ? '#4EB87A' : b.color"
                  [attr.stroke-width]="b.healed ? 1.5 : 2.5"
                  [attr.stroke-opacity]="b.healed ? 0.6 * (1 - b.healProgress) + 0.01 : 0.85"
                  stroke-linecap="round" stroke-dasharray="4 3"/>
          </g>
        }

        <!-- Healing convergence flash -->
        @for (b of branches(); track b.id) {
          @if (b.healed && b.healProgress < 1) {
            <circle [attr.cx]="b.tripNode.x" [attr.cy]="b.tripNode.y" [attr.r]="b.healProgress * 40"
                    fill="none" stroke="#4EB87A" stroke-width="2"
                    [attr.stroke-opacity]="0.6 * (1 - b.healProgress)"/>
          }
        }

        <!-- Trip nodes -->
        @for (node of tripNodes(); track node.trip.guid) {
          <g>
            <!-- halo -->
            <circle [attr.cx]="node.x" [attr.cy]="node.y" r="24"
                    fill="none" stroke="#C9A84C" stroke-width="1"
                    stroke-opacity="0.15" style="animation:halo-pulse 3s ease-in-out infinite"/>
            <!-- danger ring for critical -->
            @if (node.trip.tripType === 'CriticalTrip') {
              <circle [attr.cx]="node.x" [attr.cy]="node.y" r="18"
                      fill="none" stroke="#E05A4E" stroke-width="1.5"
                      stroke-opacity="0.6" stroke-dasharray="4 3"/>
            }
            <!-- orb -->
            <circle [attr.cx]="node.x" [attr.cy]="node.y" r="9"
                    fill="url(#orb-grad)"
                    style="cursor:pointer;animation:pulse-orb 4s ease-in-out infinite"
                    (click)="selectTrip(node.trip)"/>
            <!-- label -->
            <text [attr.x]="node.x" [attr.y]="node.y - 30"
                  text-anchor="middle" fill="#C9A84C" font-size="10"
                  font-family="'Courier New',monospace" opacity="0.75">
              {{ node.trip.tripName ?? 'UNNAMED' | slice:0:20 }}
            </text>
          </g>
        }

        <!-- Comet animation along prime strand -->
        <path [attr.d]="primePath()" fill="none" stroke="rgba(255,255,255,0.6)" stroke-width="1.5"
              stroke-dasharray="40 960" stroke-linecap="round"
              style="animation:comet 8s linear infinite"/>
        <path [attr.d]="primePath()" fill="none" stroke="rgba(201,168,76,0.4)" stroke-width="1"
              stroke-dasharray="20 980" stroke-linecap="round"
              style="animation:comet 12s linear infinite 4s"/>
      </svg>

      <!-- Integrity Meter HUD -->
      <div style="position:absolute;top:32px;left:32px;width:220px;">
        <div style="font-size:10px;letter-spacing:0.12em;color:#6B7488;margin-bottom:6px;">TEMPORAL INTEGRITY</div>
        <div style="position:relative;height:6px;background:rgba(255,255,255,0.07);border-radius:3px;overflow:hidden;">
          <div [style.width]="integrity() + '%'"
               [style.background]="integrityColor()"
               style="height:100%;transition:width 0.8s,background 0.8s;border-radius:3px;"></div>
        </div>
        <div [style.color]="integrityColor()"
             style="font-size:22px;font-weight:700;margin-top:8px;letter-spacing:0.04em;">
          {{ integrity() | number:'1.0-0' }}%
        </div>
        <div style="font-size:10px;color:#4B556A;margin-top:4px;">
          {{ openParadoxes() }} ACTIVE FRACTURE{{ openParadoxes() === 1 ? '' : 'S' }}
        </div>
      </div>

      <!-- Top-right title -->
      <div style="position:absolute;top:32px;right:32px;text-align:right;">
        <div style="font-size:9px;letter-spacing:0.25em;color:#4B556A;">⧗ THE LOOM</div>
        <div style="font-size:11px;color:#6B7488;margin-top:4px;">Observer Mode — Time Itself</div>
      </div>

      <!-- Legend -->
      <div style="position:absolute;bottom:32px;left:32px;">
        <div style="font-size:9px;letter-spacing:0.1em;color:#4B556A;margin-bottom:8px;">PARADOX SPECTRUM</div>
        @for (entry of paradoxLegend; track entry.type) {
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:5px;">
            <div [style.background]="entry.color"
                 style="width:24px;height:3px;border-radius:2px;box-shadow:0 0 6px currentColor;"></div>
            <span style="font-size:9px;color:#6B7488;letter-spacing:0.05em;">{{ entry.label }}</span>
          </div>
        }
      </div>

      <!-- Right panel -->
      <div style="position:absolute;top:0;right:0;height:100%;width:300px;
                  background:rgba(2,4,8,0.85);border-left:1px solid rgba(201,168,76,0.08);
                  display:flex;flex-direction:column;">

        <!-- Selected trip details -->
        <div style="padding:24px;border-bottom:1px solid rgba(255,255,255,0.05);flex-shrink:0;">
          @if (selectedTrip()) {
            <div style="font-size:10px;color:#8A93A6;letter-spacing:0.1em;margin-bottom:6px;">SELECTED NODE</div>
            <div style="font-size:14px;color:#F0EDE6;margin-bottom:4px;">{{ selectedTrip()!.tripName }}</div>
            <div style="font-size:11px;color:#6B7488;">{{ selectedTrip()!.tripType }}</div>
            <div style="margin-top:10px;font-size:11px;color:#8A93A6;">
              {{ selectedTripParadoxes().length }} paradox{{ selectedTripParadoxes().length === 1 ? '' : 'es' }}
            </div>
          } @else {
            <div style="font-size:11px;color:#4B556A;font-style:italic;">Click a node to inspect…</div>
          }
        </div>

        <!-- Introduce paradox -->
        <div style="padding:20px;border-bottom:1px solid rgba(255,255,255,0.05);flex-shrink:0;">
          <div style="font-size:10px;color:#6B7488;letter-spacing:0.1em;margin-bottom:10px;">SIMULATION CONTROLS</div>
          <div style="margin-bottom:10px;">
            <div style="font-size:10px;color:#6B7488;margin-bottom:5px;">TARGET NODE</div>
            <select [(ngModel)]="introduceTargetGuid"
                    style="width:100%;background:#060C14;border:1px solid #1E2A3A;
                           color:#B7BFCC;padding:8px 10px;font-size:11px;font-family:'Courier New',monospace;
                           border-radius:2px;">
              <option value="">— Select Trip —</option>
              @for (n of tripNodes(); track n.trip.guid) {
                <option [value]="n.trip.guid">{{ n.trip.tripName ?? n.trip.guid.slice(0,8) }}</option>
              }
            </select>
          </div>
          <button (click)="introduceParadox()" [disabled]="introducing() || !introduceTargetGuid"
                  [style.background]="introducing() ? 'rgba(224,90,78,0.3)' : '#E05A4E'"
                  style="width:100%;border:none;color:#fff;font-weight:700;font-size:11px;
                         padding:12px;cursor:pointer;border-radius:2px;letter-spacing:0.12em;
                         transition:all 0.2s;">
            {{ introducing() ? 'FRACTURING…' : '⚡ INTRODUCE PARADOX' }}
          </button>
          @if (introduceError()) {
            <div style="color:#E05A4E;font-size:10px;margin-top:6px;">{{ introduceError() }}</div>
          }
        </div>

        <!-- Fracture log -->
        <div style="flex:1;overflow-y:auto;padding:20px;">
          <div style="font-size:10px;color:#6B7488;letter-spacing:0.1em;margin-bottom:12px;">FRACTURE LOG</div>
          @for (b of branches(); track b.id) {
            <div style="margin-bottom:14px;padding:10px;background:rgba(255,255,255,0.02);border-radius:3px;"
                 [style.border-left]="'2px solid ' + b.color">
              <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">
                <div>
                  <div style="font-size:10px;margin-bottom:3px;" [style.color]="b.color">
                    {{ b.paradox.paradoxType }}
                  </div>
                  <div style="font-size:9px;color:#4B556A;">{{ b.tripNode.trip.tripName?.slice(0,22) }}</div>
                </div>
                <div [style.color]="b.healed ? '#4EB87A' : '#E05A4E'"
                     style="font-size:9px;flex-shrink:0;margin-top:2px;">
                  {{ b.healed ? '✓ HEALED' : '✗ ACTIVE' }}
                </div>
              </div>
            </div>
          }
          @if (branches().length === 0) {
            <div style="font-size:10px;color:#2E3E54;font-style:italic;">No fractures detected.</div>
          }
        </div>
      </div>

      <!-- Spark overlay -->
      <canvas #sparkCanvas style="position:absolute;inset:0;pointer-events:none;z-index:10;"></canvas>
    </div>
  `,
})
export class LoomComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('starCanvas') starCanvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('svgLoom') svgRef!: ElementRef<SVGSVGElement>;
  @ViewChild('sparkCanvas') sparkCanvasRef!: ElementRef<HTMLCanvasElement>;

  private readonly tripService = inject(TripService);
  private readonly paradoxService = inject(ParadoxService);
  private readonly destroyRef = inject(DestroyRef);

  readonly W = 1600;
  readonly H = 900;

  private trips = signal<TripDto[]>([]);
  private previousStatuses = new Map<string, string>();
  private healingBranches = new Set<string>();
  private rafId: number | null = null;
  private starRafId: number | null = null;

  readonly plasmaSeed = signal(1);
  readonly plasmaFreq = signal('0.018 0.025');

  // Prime bezier control points
  private P0: [number,number] = [80, 450];
  private P1: [number,number] = [480, 200];
  private P2: [number,number] = [1120, 700];
  private P3: [number,number] = [1280, 450];

  readonly primePath = computed(() => {
    const [x0,y0] = this.P0, [x1,y1] = this.P1, [x2,y2] = this.P2, [x3,y3] = this.P3;
    return `M ${x0} ${y0} C ${x1} ${y1} ${x2} ${y2} ${x3} ${y3}`;
  });

  readonly tripNodes = computed((): TripNode[] => {
    const ts = this.trips();
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

  integrityColor(): string {
    const v = this.integrity();
    if (v > 70) return '#4EB87A';
    if (v > 40) return '#C9A84C';
    return '#E05A4E';
  }

  readonly selectedTrip = signal<TripDto | null>(null);
  readonly selectedTripParadoxes = computed(() => {
    const t = this.selectedTrip();
    if (!t) return [];
    return this.branches().filter(b => b.tripNode.trip.guid === t.guid);
  });

  readonly introducing = signal(false);
  readonly introduceError = signal('');
  introduceTargetGuid = '';

  readonly paradoxLegend = Object.entries(PARADOX_COLORS).map(([type, color]) => ({
    type,
    label: type.replace(/([A-Z])/g, ' $1').trim(),
    color,
  }));

  ngOnInit(): void {
    timer(0, 5000).pipe(
      switchMap(() => this.tripService.getAll()),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: trips => {
        this.diffAndUpdateBranches(trips);
        this.trips.set(trips);
      },
      error: () => {},
    });

    // Animate plasma seed
    setInterval(() => {
      this.plasmaSeed.set((this.plasmaSeed() % 9999) + 1);
    }, 120);
  }

  ngAfterViewInit(): void {
    this.initStarfield();
  }

  ngOnDestroy(): void {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    if (this.starRafId) cancelAnimationFrame(this.starRafId);
  }

  private diffAndUpdateBranches(trips: TripDto[]): void {
    const nodes = this.tripNodes();
    const laneCounters = new Map<string, number>();
    const newBranches: Branch[] = [];

    for (const trip of trips) {
      const node = nodes.find(n => n.trip.guid === trip.guid);
      if (!node) continue;
      for (const p of trip.paradoxes) {
        const prevStatus = this.previousStatuses.get(p.guid);
        const isHealed = p.paradoxStatus === 'Solved';
        const wasHealed = prevStatus === 'Solved';

        // Fire healing animation if newly healed
        if (isHealed && !wasHealed && prevStatus !== undefined) {
          this.healingBranches.add(p.guid);
          this.animateHeal(p.guid);
        }
        this.previousStatuses.set(p.guid, p.paradoxStatus);

        const key = trip.guid;
        const count = laneCounters.get(key) ?? 0;
        laneCounters.set(key, count + 1);
        const lane = Math.floor(count / 2) + 1;
        const dir: 1 | -1 = count % 2 === 0 ? 1 : -1;

        newBranches.push({
          paradox: p,
          tripNode: node,
          lane,
          dir,
          color: paradoxColor(p.paradoxType),
          healed: isHealed,
          healProgress: isHealed ? 1 : 0,
          id: p.guid,
        });
      }
    }

    this.branches.set(newBranches);
  }

  private animateHeal(paradoxGuid: string): void {
    const startTime = performance.now();
    const duration = 1200;

    const step = (now: number) => {
      const p = Math.min((now - startTime) / duration, 1);
      this.branches.update(bs => bs.map(b =>
        b.id === paradoxGuid ? { ...b, healProgress: p, healed: true } : b
      ));
      if (p < 1) requestAnimationFrame(step);
      else this.healingBranches.delete(paradoxGuid);
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
      return `M ${x} ${y} Q ${x + spread * 0.5 * (1-hp)} ${y + len * b.dir * (1-hp) * 0.5} ${endX} ${endY}`;
    }

    const cx1 = x + spread * 0.4;
    const cy1 = y + len * b.dir * 0.3;
    const cx2 = x + spread * 0.7;
    const cy2 = y + len * b.dir * 0.7;
    const ex = x + spread;
    const ey = y + len * b.dir;
    return `M ${x} ${y} C ${cx1} ${cy1} ${cx2} ${cy2} ${ex} ${ey}`;
  }

  selectTrip(trip: TripDto): void {
    this.selectedTrip.set(trip);
  }

  introduceParadox(): void {
    if (!this.introduceTargetGuid) return;
    this.introducing.set(true);
    this.introduceError.set('');

    this.paradoxService.addToTrip(this.introduceTargetGuid).subscribe({
      next: () => {
        this.introducing.set(false);
        this.sparkAt(this.introduceTargetGuid);
      },
      error: err => {
        this.introducing.set(false);
        this.introduceError.set(err?.error ?? 'Failed to introduce paradox.');
      },
    });
  }

  private sparkAt(tripGuid: string): void {
    const node = this.tripNodes().find(n => n.trip.guid === tripGuid);
    if (!node || !this.sparkCanvasRef) return;

    const canvas = this.sparkCanvasRef.nativeElement;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    const ctx = canvas.getContext('2d')!;

    const scaleX = rect.width / this.W;
    const scaleY = rect.height / this.H;
    const cx = node.x * scaleX;
    const cy = node.y * scaleY;

    interface Spark { x: number; y: number; vx: number; vy: number; life: number; color: string }
    const sparks: Spark[] = Array.from({ length: 40 }, () => {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 5;
      return { x: cx, y: cy, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
               life: 1, color: `hsl(${Math.random() * 40},100%,70%)` };
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

  private initStarfield(): void {
    const canvas = this.starCanvasRef.nativeElement;
    const ctx = canvas.getContext('2d')!;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    interface Star { x: number; y: number; r: number; a: number; da: number; layer: number }
    const stars: Star[] = Array.from({ length: 220 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.2 + 0.2,
      a: Math.random(),
      da: (Math.random() - 0.5) * 0.005,
      layer: Math.floor(Math.random() * 3),
    }));

    interface Comet { x: number; y: number; vx: number; vy: number; life: number; maxLife: number }
    const comets: Comet[] = [];

    const drawFrame = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Stars
      for (const s of stars) {
        s.a = Math.max(0.05, Math.min(1, s.a + s.da));
        if (s.a <= 0.06 || s.a >= 0.99) s.da *= -1;
        ctx.globalAlpha = s.a * (0.4 + s.layer * 0.2);
        ctx.fillStyle = '#F0EDE6';
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // Shooting stars
      if (Math.random() < 0.004) {
        comets.push({ x: Math.random() * canvas.width, y: Math.random() * canvas.height * 0.5,
                      vx: 4 + Math.random() * 6, vy: 1 + Math.random() * 2, life: 1, maxLife: 1 });
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
