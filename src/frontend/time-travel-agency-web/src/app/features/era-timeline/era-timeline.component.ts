import {
  Component, OnInit, AfterViewInit, OnDestroy, inject, signal, computed, ElementRef, viewChild
} from '@angular/core';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { TripService } from '../../core/services/trip.service';
import { AgentService } from '../../core/services/agent.service';
import { AppStateService } from '../../state/app-state.service';
import { TripDto } from '../../core/models/trip.model';
import { AgentDto } from '../../core/models/agent.model';
import { formatDateOnly, isBookingOpen, isDeparted } from '../../shared/utils/date.utils';

// ─── Era Zone Definitions ─────────────────────────────────────────────────────

interface EraZone {
  name: string;
  label: string;
  shortLabel: string;
  startYear: number;
  endYear: number;
  accent: string;
  bg: string;
  pxStart: number;
}

const ZONE_W = 1800;

const ERA_ZONES: EraZone[] = [
  {
    name: 'deep-past', label: 'Deep Past', shortLabel: 'Deep Past',
    startYear: -3_000_000, endYear: -10_000, accent: '#E8590C',
    bg: 'linear-gradient(135deg, #120A05 0%, #2B1608 60%, #1A0F0A 100%)',
    pxStart: 0,
  },
  {
    name: 'ancient', label: 'Ancient World', shortLabel: 'Ancient',
    startYear: -10_000, endYear: 500, accent: '#D4A017',
    bg: 'linear-gradient(135deg, #1C160A 0%, #2E240F 60%, #1A1508 100%)',
    pxStart: ZONE_W,
  },
  {
    name: 'medieval', label: 'Medieval', shortLabel: 'Medieval',
    startYear: 500, endYear: 1400, accent: '#9B2226',
    bg: 'linear-gradient(135deg, #160B0D 0%, #241014 60%, #1A0D10 100%)',
    pxStart: ZONE_W * 2,
  },
  {
    name: 'renaissance', label: 'Renaissance', shortLabel: 'Renaissance',
    startYear: 1400, endYear: 1750, accent: '#2A9D8F',
    bg: 'linear-gradient(135deg, #0A1614 0%, #10241F 60%, #0D1A18 100%)',
    pxStart: ZONE_W * 3,
  },
  {
    name: 'industrial', label: 'Industrial Era', shortLabel: 'Industrial',
    startYear: 1750, endYear: 1950, accent: '#B08968',
    bg: 'linear-gradient(135deg, #14120E 0%, #1E1B16 60%, #181510 100%)',
    pxStart: ZONE_W * 4,
  },
  {
    name: 'contemporary', label: 'Contemporary', shortLabel: 'Contemporary',
    startYear: 1950, endYear: 2100, accent: '#00B4D8',
    bg: 'linear-gradient(135deg, #0A1218 0%, #0E1E28 60%, #0C1820 100%)',
    pxStart: ZONE_W * 5,
  },
  {
    name: 'far-future', label: 'Far Future', shortLabel: 'Future',
    startYear: 2100, endYear: 5000, accent: '#B5179E',
    bg: 'linear-gradient(135deg, #120A1C 0%, #1C0F2E 60%, #150C22 100%)',
    pxStart: ZONE_W * 6,
  },
];

const TOTAL_W = ZONE_W * ERA_ZONES.length;
const SPINE_PCT = 62;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function yearToPx(year: number): number {
  let zone = ERA_ZONES.find(z => year >= z.startYear && year < z.endYear);
  if (!zone) zone = year < ERA_ZONES[0].startYear ? ERA_ZONES[0] : ERA_ZONES[ERA_ZONES.length - 1];
  const t = Math.max(0, Math.min(1, (year - zone.startYear) / (zone.endYear - zone.startYear)));
  return zone.pxStart + t * ZONE_W;
}

function zoneForPx(px: number): EraZone {
  return ERA_ZONES.find(z => px >= z.pxStart && px < z.pxStart + ZONE_W) ?? ERA_ZONES[ERA_ZONES.length - 1];
}

function tripDestYear(trip: TripDto, agentMap: Map<number, AgentDto>): number {
  const epoch = agentMap.get(trip.licensedAgentId)?.specialisationEpochId;
  if (epoch?.startYear !== undefined && epoch?.endYear !== undefined) {
    return Math.round((epoch.startYear + epoch.endYear) / 2);
  }
  let h = 0;
  for (const c of trip.guid) h = (h * 31 + c.charCodeAt(0)) & 0x7fffffff;
  return Math.round(-2500 + (h % 5000));
}

function formatYear(year: number): string {
  const abs = Math.abs(year);
  if (year < 0) return abs >= 1_000_000 ? `${(abs / 1_000_000).toFixed(1)}M BC` : `${abs.toLocaleString()} BC`;
  if (year < 1000) return `${year} AD`;
  return year.toString();
}

function riskLevel(trip: TripDto): 'low' | 'elevated' | 'critical' {
  const n = trip.paradoxes.length;
  return n === 0 ? 'low' : n <= 2 ? 'elevated' : 'critical';
}

const RISK_COLORS = { low: '#3FAE79', elevated: '#D9A24E', critical: '#E05A4E' } as const;
const RISK_LABELS = { low: 'Low Risk', elevated: 'Elevated', critical: 'Critical Risk' } as const;

interface TripPin {
  trip: TripDto;
  year: number;
  x: number;
  zone: EraZone;
  stemHeight: number;
  isCritical: boolean;
  risk: 'low' | 'elevated' | 'critical';
  signalBars: number;
}

// ─── Component ────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-era-timeline',
  standalone: true,
  styles: [`
    @keyframes pulse-ring {
      0%   { transform: translate(-50%, -50%) scale(1);   opacity: 0.8; }
      100% { transform: translate(-50%, -50%) scale(2.8); opacity: 0;   }
    }
    @keyframes spin-slow {
      from { transform: rotate(0deg); }
      to   { transform: rotate(360deg); }
    }
    @keyframes spin-reverse {
      from { transform: rotate(360deg); }
      to   { transform: rotate(0deg); }
    }
    @keyframes fade-in-up {
      from { opacity: 0; transform: translateY(10px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes data-flow {
      from { background-position: 0 0; }
      to   { background-position: -50px 0; }
    }
    @keyframes holo-materialize {
      0%   { opacity: 0; transform: translateX(-50%) translateY(8px) scale(0.92); filter: brightness(2.2); }
      60%  { opacity: 1; filter: brightness(1.4); }
      100% { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); filter: brightness(1); }
    }
    @keyframes shimmer {
      0%   { transform: translateX(-140%); }
      100% { transform: translateX(140%); }
    }
    @keyframes holo-scan {
      0%   { transform: translateY(-100%); opacity: 0; }
      50%  { opacity: 0.7; }
      100% { transform: translateY(120%); opacity: 0; }
    }
    @keyframes gate-flicker {
      0%,100% { opacity: 0.55; }
      45%  { opacity: 0.9; }
      55%  { opacity: 0.35; }
    }
    @keyframes led-blink {
      0%,100% { opacity: 1; }
      50%  { opacity: 0.25; }
    }
    @keyframes card-enter {
      from { opacity: 0; transform: translateY(-8px) scale(0.98); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }
    @keyframes comet-star {
      0%   { opacity: 0; transform: scaleX(0); }
      10%  { opacity: 0.7; transform: scaleX(1); }
      90%  { opacity: 0.5; }
      100% { opacity: 0; transform: scaleX(1) translateX(200px); }
    }

    .timeline-scroll::-webkit-scrollbar { display: none; }
    .timeline-scroll { scrollbar-width: none; -ms-overflow-style: none; }

    .era-chip { transition: box-shadow 0.2s, border-color 0.2s; }
    .era-chip:hover { box-shadow: 0 0 14px currentColor; }

    .pin-beacon { transition: transform 0.15s cubic-bezier(.34,1.56,.64,1), filter 0.15s; }
    .pin-beacon:hover { transform: scale(1.2); filter: brightness(1.3); }

    .booking-btn { transition: filter 0.15s, transform 0.1s, box-shadow 0.15s; }
    .booking-btn:hover:not([disabled]) { filter: brightness(1.15); box-shadow: 0 0 20px currentColor; }
    .booking-btn:active:not([disabled]) { transform: scale(0.97); }

    .itinerary-link { transition: color 0.15s; }
    .itinerary-link:hover { color: #F0EDE6 !important; }

    .close-btn { transition: background 0.15s, color 0.15s; }
    .close-btn:hover { background: rgba(255,255,255,0.14) !important; color: #F0EDE6 !important; }

    .scrubber-btn { transition: background 0.15s; }
    .scrubber-btn:hover { background: rgba(255,255,255,0.06) !important; }
  `],
  template: `
<div style="position:relative;height:calc(100vh - 65px);overflow:hidden;background:#030508;user-select:none;">

  <!-- ── Starfield Canvas (layer 0) ───────────────────────────────── -->
  <canvas #starCanvas style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:0;"></canvas>

  <!-- ── Global Scanlines ─────────────────────────────────────────── -->
  <div style="position:absolute;inset:0;pointer-events:none;z-index:2;
              background:repeating-linear-gradient(0deg,rgba(255,255,255,0.022) 0px,rgba(255,255,255,0.022) 1px,transparent 1px,transparent 4px);
              mix-blend-mode:overlay;opacity:0.6;"></div>

  <!-- ── Vignette ──────────────────────────────────────────────────── -->
  <div style="position:absolute;inset:0;pointer-events:none;z-index:2;
              background:radial-gradient(ellipse at center,transparent 50%,rgba(0,0,0,0.65) 100%);"></div>

  <!-- ── Era HUD Bar + Jump Chips ─────────────────────────────────── -->
  <div style="position:absolute;top:14px;left:50%;transform:translateX(-50%);z-index:20;
              background:rgba(7,10,18,0.72);border:1px solid rgba(255,255,255,0.07);
              border-radius:3px;backdrop-filter:blur(10px);
              padding:6px 10px;display:flex;align-items:center;gap:10px;
              box-shadow:0 4px 24px rgba(0,0,0,0.5);">
    <span style="font-family:'IBM Plex Mono',monospace;font-size:8.5px;
                 letter-spacing:0.18em;color:#3E5068;white-space:nowrap;padding-right:6px;
                 border-right:1px solid rgba(255,255,255,0.07);">⧗ ERA SELECT</span>
    <div style="display:flex;gap:5px;flex-wrap:wrap;justify-content:center;">
      @for (zone of eraZones; track zone.name; let zi = $index) {
        <button class="era-chip"
                (click)="jumpToZone(zone)"
                [style.color]="activeZone().name === zone.name ? zone.accent : '#4E5E74'"
                [style.background]="activeZone().name === zone.name ? zone.accent + '18' : 'rgba(11,14,20,0.5)'"
                [style.borderColor]="activeZone().name === zone.name ? zone.accent : 'rgba(255,255,255,0.07)'"
                [style.boxShadow]="activeZone().name === zone.name ? '0 0 12px ' + zone.accent + '55,inset 0 0 8px ' + zone.accent + '22' : 'none'"
                style="border:1px solid;padding:4px 10px 4px 7px;border-radius:0;cursor:pointer;
                       clip-path:polygon(0 0,calc(100% - 5px) 0,100% 5px,100% 100%,5px 100%,0 calc(100% - 5px));
                       font-size:10px;font-family:'IBM Plex Mono',monospace;letter-spacing:0.04em;
                       display:flex;align-items:center;gap:5px;">
          <!-- LED dot -->
          <span [style.background]="activeZone().name === zone.name ? zone.accent : '#1E2A3A'"
                [style.boxShadow]="activeZone().name === zone.name ? '0 0 6px ' + zone.accent : 'none'"
                [style.animation]="activeZone().name === zone.name ? 'led-blink 2s ease-in-out infinite' : 'none'"
                style="display:inline-block;width:4px;height:4px;border-radius:50%;flex-shrink:0;"></span>
          <span style="font-size:8px;opacity:0.45;margin-right:1px;">{{ ('0' + (zi+1)).slice(-2) }}</span>
          {{ zone.shortLabel }}
        </button>
      }
    </div>
  </div>

  <!-- ── Scrollable Timeline ────────────────────────────────────────── -->
  <div class="timeline-scroll" #scrollEl
       (scroll)="onScroll($event)"
       style="position:absolute;inset:0;padding-bottom:46px;z-index:1;
              overflow-x:auto;overflow-y:hidden;cursor:grab;-webkit-overflow-scrolling:touch;">

    <div [style.width.px]="totalWidth" style="height:100%;position:relative;">

      <!-- Zone Bands -->
      @for (zone of eraZones; track zone.name; let zi = $index) {
        <div style="position:absolute;top:0;bottom:0;"
             [style.left.px]="zone.pxStart"
             [style.width.px]="zoneWidth"
             style="background:rgba(11,14,20,0.48);">

          <!-- Era-colored energy halo centered on spine -->
          <div style="position:absolute;inset:0;pointer-events:none;"
               [style.background]="'radial-gradient(ellipse 65% 85% at 50% ' + spinePct + '%, ' + zone.accent + '22 0%, ' + zone.accent + '0A 35%, transparent 70%)'">
          </div>

          <!-- Coordinate grid overlay -->
          <div style="position:absolute;inset:0;pointer-events:none;opacity:0.045;"
               [style.backgroundImage]="'linear-gradient(' + zone.accent + ' 1px, transparent 1px), linear-gradient(90deg, ' + zone.accent + ' 1px, transparent 1px)'"
               style="background-size:80px 80px;">
          </div>

          <!-- Corner crosshair ticks (top-left) -->
          <div style="position:absolute;top:12px;left:12px;pointer-events:none;"
               [style.color]="zone.accent + '44'">
            <div style="position:absolute;top:0;left:0;width:10px;height:1px;" [style.background]="zone.accent + '55'"></div>
            <div style="position:absolute;top:0;left:0;width:1px;height:10px;" [style.background]="zone.accent + '55'"></div>
          </div>
          <!-- Corner crosshair (top-right) -->
          <div style="position:absolute;top:12px;right:12px;pointer-events:none;">
            <div style="position:absolute;top:0;right:0;width:10px;height:1px;" [style.background]="zone.accent + '55'"></div>
            <div style="position:absolute;top:0;right:0;width:1px;height:10px;" [style.background]="zone.accent + '55'"></div>
          </div>

          <!-- Holographic era label -->
          <div style="position:absolute;top:50%;transform:translateY(-60%);
                      left:0;right:0;text-align:center;pointer-events:none;overflow:hidden;">
            <div style="font-family:'Fraunces',serif;font-size:clamp(56px,8vw,100px);
                        font-weight:700;font-style:italic;line-height:1;
                        letter-spacing:-0.02em;white-space:nowrap;opacity:0.07;position:relative;"
                 [style.color]="zone.accent"
                 [style.textShadow]="'0 0 30px ' + zone.accent + ',0 0 60px ' + zone.accent + '44'">
              {{ zone.label.toUpperCase() }}
              <!-- scan strip -->
              <div style="position:absolute;inset:0;overflow:hidden;pointer-events:none;opacity:0.6;">
                <div style="position:absolute;left:0;right:0;height:2px;"
                     [style.background]="zone.accent + 'AA'"
                     [style.animation]="'holo-scan ' + (4 + zi * 0.7) + 's linear infinite'">
                </div>
              </div>
            </div>
          </div>

          <!-- Year range HUD label -->
          <div style="position:absolute;bottom:54px;left:0;right:0;text-align:center;pointer-events:none;">
            <div style="font-family:'IBM Plex Mono',monospace;font-size:8.5px;
                        letter-spacing:0.22em;opacity:0.22;"
                 [style.color]="zone.accent">
              ◈ SECTOR {{ formatYear(zone.startYear) }} — {{ formatYear(zone.endYear) }}
            </div>
          </div>

          <!-- Warp-field gate at right boundary -->
          @if (zi < eraZones.length - 1) {
            <div style="position:absolute;right:-1px;top:0;bottom:54px;width:3px;z-index:3;
                        animation:gate-flicker 4s ease-in-out infinite;pointer-events:none;"
                 [style.animationDelay]="(zi * 0.6) + 's'">
              <!-- bloom -->
              <div style="position:absolute;top:0;bottom:0;right:-7px;width:18px;pointer-events:none;filter:blur(8px);"
                   [style.background]="'linear-gradient(to bottom,transparent,' + zone.accent + '44,' + eraZones[zi+1].accent + '44,transparent)'">
              </div>
              <!-- core column -->
              <div style="position:absolute;top:0;bottom:0;left:0;width:2px;"
                   [style.background]="'linear-gradient(to bottom,transparent,' + zone.accent + ' 20%,' + eraZones[zi+1].accent + ' 80%,transparent)'"
                   [style.boxShadow]="'0 0 10px ' + zone.accent + ',0 0 18px ' + eraZones[zi+1].accent + '44'">
              </div>
            </div>
          }
        </div>
      }

      <!-- ── Plasma Conduit (Spine) ─────────────────────────────────── -->
      <div style="position:absolute;left:0;right:0;pointer-events:none;z-index:2;"
           [style.top.%]="spinePct">
        @for (zone of eraZones; track zone.name; let zi = $index) {
          <!-- Outer bloom -->
          <div style="position:absolute;top:-6px;height:15px;"
               [style.left.px]="zone.pxStart"
               [style.width.px]="zoneWidth"
               [style.background]="'linear-gradient(to right,transparent,' + zone.accent + '55 20%,' + zone.accent + '55 80%,transparent)'"
               style="filter:blur(6px);opacity:0.5;">
          </div>
          <!-- Mid glow -->
          <div style="position:absolute;top:-1.5px;height:5px;"
               [style.left.px]="zone.pxStart"
               [style.width.px]="zoneWidth"
               [style.background]="zone.accent"
               style="filter:blur(1.5px);opacity:0.75;">
          </div>
          <!-- Core strand -->
          <div style="position:absolute;top:0;height:1.5px;"
               [style.left.px]="zone.pxStart"
               [style.width.px]="zoneWidth"
               [style.background]="'linear-gradient(to right,' + zone.accent + '88,#F0EDE6 30%,#F0EDE6 70%,' + zone.accent + '88)'"
               [style.boxShadow]="'0 0 8px ' + zone.accent">
          </div>
          <!-- Data-flow particles -->
          <div style="position:absolute;top:-0.5px;height:3px;mix-blend-mode:screen;"
               [style.left.px]="zone.pxStart"
               [style.width.px]="zoneWidth"
               [style.backgroundImage]="'repeating-linear-gradient(90deg,transparent 0,transparent 44px,' + zone.accent + 'DD 46px,transparent 50px)'"
               [style.animation]="'data-flow ' + (2.6 + (zi % 2) * 0.8) + 's linear infinite'"
               style="opacity:0.8;">
          </div>
        }

        <!-- Year ticks -->
        @for (tick of yearTicks(); track tick.px) {
          <div style="position:absolute;top:-18px;display:flex;flex-direction:column;align-items:center;pointer-events:none;"
               [style.left.px]="tick.px - 1">
            <div style="font-family:'IBM Plex Mono',monospace;font-size:7.5px;color:#2A3A50;
                        white-space:nowrap;margin-bottom:2px;letter-spacing:0.06em;">{{ tick.label }}</div>
            <div style="width:1px;height:10px;"
                 [style.background]="'linear-gradient(to bottom,' + zoneForYear(tick.year).accent + '00,' + zoneForYear(tick.year).accent + '88)'"
                 [style.boxShadow]="'0 0 4px ' + zoneForYear(tick.year).accent + '66'">
            </div>
          </div>
        }
      </div>

      <!-- ── Holographic Sensor Beacons (Trip Pins) ─────────────────── -->
      @for (pin of pins(); track pin.trip.guid) {
        <div style="position:absolute;display:flex;flex-direction:column;align-items:center;
                    cursor:pointer;z-index:5;transition:opacity 0.25s;"
             [style.left.px]="pin.x - 11"
             [style.top.%]="spinePct"
             [style.marginTop.px]="-(pin.stemHeight + 22)"
             [style.opacity]="selectedTripGuid() && selectedTripGuid() !== pin.trip.guid ? '0.28' : '1'"
             (click)="selectPin($event, pin)"
             (mouseenter)="hoverPin.set(pin.trip.guid)"
             (mouseleave)="hoverPin.set(null)">

          <!-- Holographic readout tooltip (hover) -->
          @if (hoverPin() === pin.trip.guid && selectedTripGuid() !== pin.trip.guid) {
            <div style="position:absolute;bottom:calc(100% + 18px);left:50%;width:230px;
                        background:rgba(10,16,30,0.82);backdrop-filter:blur(14px);
                        border:1px solid;border-radius:3px;padding:14px 16px;
                        pointer-events:none;z-index:15;
                        box-shadow:0 0 0 1px rgba(255,255,255,0.04),0 14px 50px rgba(0,0,0,0.7),inset 0 0 20px rgba(255,255,255,0.02);
                        animation:holo-materialize 0.22s ease forwards;"
                 [style.borderColor]="pin.zone.accent + '55'"
                 [style.boxShadow]="'0 0 0 1px ' + pin.zone.accent + '22,0 14px 50px rgba(0,0,0,0.7),inset 0 0 20px ' + pin.zone.accent + '11'">
              <!-- Corner reticle brackets -->
              <div style="position:absolute;top:5px;left:5px;width:9px;height:9px;pointer-events:none;"
                   [style.borderTop]="'1.5px solid ' + pin.zone.accent"
                   [style.borderLeft]="'1.5px solid ' + pin.zone.accent"></div>
              <div style="position:absolute;top:5px;right:5px;width:9px;height:9px;pointer-events:none;"
                   [style.borderTop]="'1.5px solid ' + pin.zone.accent"
                   [style.borderRight]="'1.5px solid ' + pin.zone.accent"></div>
              <div style="position:absolute;bottom:5px;left:5px;width:9px;height:9px;pointer-events:none;"
                   [style.borderBottom]="'1.5px solid ' + pin.zone.accent"
                   [style.borderLeft]="'1.5px solid ' + pin.zone.accent"></div>
              <div style="position:absolute;bottom:5px;right:5px;width:9px;height:9px;pointer-events:none;"
                   [style.borderBottom]="'1.5px solid ' + pin.zone.accent"
                   [style.borderRight]="'1.5px solid ' + pin.zone.accent"></div>
              <!-- Scan line -->
              <div style="position:absolute;left:0;right:0;height:1.5px;pointer-events:none;overflow:hidden;top:0;bottom:0;">
                <div style="position:absolute;left:0;right:0;height:1.5px;animation:holo-scan 0.7s ease-out 1;"
                     [style.background]="pin.zone.accent + '88'"></div>
              </div>
              <!-- Content -->
              <div style="padding-left:4px;position:relative;z-index:1;">
                <div style="font-family:'IBM Plex Mono',monospace;font-size:8px;letter-spacing:0.12em;margin-bottom:6px;opacity:0.6;"
                     [style.color]="pin.zone.accent">
                  LAT {{ pin.zone.shortLabel.toUpperCase() }} · Δ{{ formatYear(pin.year) }} · SIG {{ pin.signalBars * 33 }}%
                </div>
                <div style="font-family:'Fraunces',serif;font-size:14px;font-weight:500;
                            margin-bottom:5px;line-height:1.3;">
                  {{ pin.trip.tripName ?? 'Unnamed Expedition' }}
                </div>
                <div style="font-size:11px;color:#8A93A6;margin-bottom:5px;">
                  Departs {{ formatDate(pin.trip.dateInRealLife) }}
                </div>
                <div style="display:flex;justify-content:space-between;align-items:center;">
                  <span style="font-size:10px;font-weight:600;" [style.color]="riskColors[pin.risk]">
                    ⬡ {{ riskLabels[pin.risk] }}
                  </span>
                  <span style="font-family:'IBM Plex Mono',monospace;font-size:9px;color:#3E5068;">
                    {{ pin.trip.customers.length }} ABOARD
                  </span>
                </div>
              </div>
            </div>
          }

          <!-- Critical plasma halo -->
          @if (pin.isCritical) {
            <div style="position:absolute;top:-11px;left:-11px;width:44px;height:44px;border-radius:50%;
                        pointer-events:none;background:radial-gradient(circle,rgba(224,90,78,0.2) 0%,transparent 70%);
                        box-shadow:0 0 16px 4px rgba(224,90,78,0.35);">
            </div>
            <!-- Counter-rotating warning ring -->
            <div style="position:absolute;top:-9px;left:-9px;width:40px;height:40px;border-radius:50%;
                        border:1px dashed rgba(224,90,78,0.5);animation:spin-reverse 4s linear infinite;
                        pointer-events:none;">
            </div>
          }

          <!-- Beacon node (hexagon) -->
          <div class="pin-beacon"
               [style.width.px]="selectedTripGuid() === pin.trip.guid ? 22 : 16"
               [style.height.px]="selectedTripGuid() === pin.trip.guid ? 22 : 16"
               [style.background]="selectedTripGuid() === pin.trip.guid ? '#F0EDE6' : pin.zone.accent"
               [style.boxShadow]="selectedTripGuid() === pin.trip.guid
                 ? '0 0 28px 10px ' + pin.zone.accent + ',inset 0 0 8px rgba(255,255,255,0.4)'
                 : '0 0 12px 3px ' + pin.zone.accent + '99,inset 0 0 6px ' + pin.zone.accent + (pin.isCritical ? ',0 0 20px 5px rgba(224,90,78,0.45)' : '')"
               style="clip-path:polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%);
                      flex-shrink:0;position:relative;z-index:2;">
          </div>

          <!-- Orbital ring -->
          <div style="position:absolute;border-radius:50%;pointer-events:none;"
               [style.top.px]="selectedTripGuid() === pin.trip.guid ? -8 : -6"
               [style.left.px]="selectedTripGuid() === pin.trip.guid ? -8 : -6"
               [style.width.px]="selectedTripGuid() === pin.trip.guid ? 38 : 28"
               [style.height.px]="selectedTripGuid() === pin.trip.guid ? 38 : 28"
               [style.border]="'1px solid ' + pin.zone.accent + '55'"
               style="animation:spin-slow 7s linear infinite;">
            <!-- Satellite dot -->
            <div style="position:absolute;top:-3px;left:50%;transform:translateX(-50%);
                        width:4px;height:4px;border-radius:50%;"
                 [style.background]="pin.zone.accent"
                 [style.boxShadow]="'0 0 6px 2px ' + pin.zone.accent">
            </div>
          </div>

          <!-- Signal strength bars -->
          <div style="position:absolute;display:flex;gap:2px;align-items:flex-end;
                      bottom:-2px;right:-18px;pointer-events:none;">
            @for (bar of [1,2,3]; track bar) {
              <div [style.background]="pin.signalBars >= bar ? pin.zone.accent : pin.zone.accent + '22'"
                   [style.boxShadow]="pin.signalBars >= bar ? '0 0 4px ' + pin.zone.accent : 'none'"
                   [style.height.px]="3 + bar * 3"
                   style="width:3px;border-radius:1px;transition:background 0.3s;">
              </div>
            }
          </div>

          <!-- Pulse sonar ring (active trips) -->
          @if (pin.trip.tripStatus === 'Active' && selectedTripGuid() !== pin.trip.guid) {
            <div style="position:absolute;top:50%;left:50%;
                        width:16px;height:16px;border-radius:50%;border:1.5px solid;pointer-events:none;"
                 [style.borderColor]="pin.isCritical ? '#E05A4E' : pin.zone.accent"
                 [style.animation]="'pulse-ring ' + (pin.isCritical ? '1.2s' : '2.2s') + ' ease-out infinite'">
            </div>
          }

          <!-- Energy tether (stem) -->
          <div style="flex-shrink:0;"
               [style.width.px]="1.5"
               [style.height.px]="pin.stemHeight"
               [style.background]="'linear-gradient(to bottom,' + pin.zone.accent + 'CC,' + pin.zone.accent + '11)'"
               [style.boxShadow]="'0 0 4px ' + pin.zone.accent + '66'">
          </div>

          <!-- Ground anchor with halo -->
          <div style="position:relative;flex-shrink:0;">
            <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
                        width:22px;height:7px;border-radius:50%;pointer-events:none;filter:blur(3px);"
                 [style.background]="'radial-gradient(' + pin.zone.accent + '88,transparent)'">
            </div>
            <div style="width:8px;height:8px;position:relative;z-index:1;"
                 [style.background]="pin.zone.accent"
                 [style.boxShadow]="'0 0 10px 3px ' + pin.zone.accent + '88'"
                 style="clip-path:polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%);">
            </div>
          </div>
        </div>
      }

      <!-- Empty state -->
      @if (!loading() && pins().length === 0) {
        <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
                    text-align:center;pointer-events:none;">
          <div style="font-family:'Fraunces',serif;font-size:22px;color:#3E4E64;margin-bottom:8px;">
            No temporal coordinates found
          </div>
          <div style="font-size:13px;color:#2A3A50;">Start the backend to load trip data.</div>
        </div>
      }

    </div>
  </div><!-- end scrollable -->

  <!-- ── Mission Timeline Scrubber ─────────────────────────────────── -->
  <div style="position:absolute;bottom:0;left:0;right:0;height:46px;z-index:20;
              background:rgba(5,7,14,0.94);border-top:1px solid rgba(255,255,255,0.06);
              display:flex;align-items:center;gap:12px;padding:0 18px;backdrop-filter:blur(6px);">

    <div style="font-family:'IBM Plex Mono',monospace;font-size:8px;color:#2A3A50;
                letter-spacing:0.16em;white-space:nowrap;">⧗ CONTINUUM&nbsp;//&nbsp;MISSION CLOCK</div>

    <div #scrubberTrack
         style="flex:1;height:10px;border-radius:2px;position:relative;cursor:pointer;
                background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.05);"
         (click)="onScrubberClick($event)">

      @for (zone of eraZones; track zone.name) {
        <div style="position:absolute;top:0;height:100%;"
             [style.left.%]="(zone.pxStart / totalWidth) * 100"
             [style.width.%]="(zoneWidth / totalWidth) * 100"
             [style.background]="zone.accent + '33'">
          <!-- Zone label inside track -->
          <div style="position:absolute;bottom:0;left:0;right:0;text-align:center;pointer-events:none;
                      font-family:'IBM Plex Mono',monospace;font-size:6px;letter-spacing:0.08em;
                      opacity:0.55;line-height:1;padding-bottom:1px;"
               [style.color]="zone.accent">
            {{ zone.shortLabel.toUpperCase().slice(0,3) }}
          </div>
        </div>
      }

      <!-- Era dividers in scrubber -->
      @for (zone of eraZones; track zone.name; let zi = $index) {
        @if (zi > 0) {
          <div style="position:absolute;top:0;bottom:0;width:1px;pointer-events:none;"
               [style.left.%]="(zone.pxStart / totalWidth) * 100"
               [style.background]="zone.accent + '66'">
          </div>
        }
      }

      <!-- Trip risk markers -->
      @for (pin of pins(); track pin.trip.guid) {
        <div style="position:absolute;top:1px;bottom:1px;width:2px;border-radius:1px;pointer-events:none;"
             [style.left.%]="(pin.x / totalWidth) * 100"
             [style.background]="riskColors[pin.risk]"
             [style.animation]="pin.risk === 'critical' ? 'led-blink 1.4s ease-in-out infinite' : 'none'"
             [style.boxShadow]="'0 0 4px ' + riskColors[pin.risk]">
        </div>
      }

      <!-- Viewport scan bracket -->
      <div style="position:absolute;top:0;bottom:0;pointer-events:none;"
           [style.left.%]="scrubberLeft()"
           [style.width.%]="scrubberWidth()">
        <!-- Corner brackets -->
        <div style="position:absolute;top:0;left:0;width:5px;height:5px;
                    border-top:1.5px solid;border-left:1.5px solid;"
             [style.borderColor]="activeZone().accent"></div>
        <div style="position:absolute;top:0;right:0;width:5px;height:5px;
                    border-top:1.5px solid;border-right:1.5px solid;"
             [style.borderColor]="activeZone().accent"></div>
        <div style="position:absolute;bottom:0;left:0;width:5px;height:5px;
                    border-bottom:1.5px solid;border-left:1.5px solid;"
             [style.borderColor]="activeZone().accent"></div>
        <div style="position:absolute;bottom:0;right:0;width:5px;height:5px;
                    border-bottom:1.5px solid;border-right:1.5px solid;"
             [style.borderColor]="activeZone().accent"></div>
        <div style="position:absolute;inset:0;"
             [style.background]="activeZone().accent + '0C'"
             [style.boxShadow]="'0 0 6px ' + activeZone().accent + '44'">
        </div>
      </div>
    </div>

    <!-- Temporal coordinate HUD -->
    <div style="min-width:100px;text-align:right;line-height:1.4;">
      <div style="font-family:'IBM Plex Mono',monospace;font-size:9px;font-weight:600;"
           [style.color]="activeZone().accent">
        <span style="animation:led-blink 2s ease-in-out infinite;display:inline-block;
                     width:5px;height:5px;border-radius:50%;vertical-align:middle;margin-right:4px;"
              [style.background]="activeZone().accent"></span>
        T-COORD {{ formatYear(currentYear()) }}
      </div>
      <div style="font-family:'IBM Plex Mono',monospace;font-size:7.5px;color:#3E5068;letter-spacing:0.08em;">
        SECTOR {{ activeZone().label.toUpperCase() }}
      </div>
    </div>
  </div>

  <!-- ── Boarding Card Overlay ─────────────────────────────────────── -->
  @if (selectedTrip()) {
    <div style="position:absolute;inset:0;z-index:30;pointer-events:all;"
         (click)="closeCard()">
      <div (click)="$event.stopPropagation()"
           style="position:absolute;top:60px;right:36px;width:400px;border-radius:4px;
                  overflow:hidden;animation:card-enter 0.2s ease forwards;
                  box-shadow:0 30px 100px rgba(0,0,0,0.8),0 0 0 1px rgba(255,255,255,0.05),
                             0 0 40px -8px {{ selectedZone().accent }}44;">

        <!-- Header band -->
        <div style="padding:22px 24px 18px;position:relative;overflow:hidden;"
             [style.background]="selectedZone().bg">

          <!-- Shimmer sweep -->
          <div style="position:absolute;inset:0;overflow:hidden;pointer-events:none;">
            <div style="position:absolute;top:0;bottom:0;width:60%;
                        mix-blend-mode:screen;animation:shimmer 3.5s ease-in-out infinite;"
                 [style.background]="'linear-gradient(115deg,transparent 20%,' + selectedZone().accent + '33 50%,transparent 80%)'">
            </div>
          </div>

          <!-- Targeting reticle (top-right) -->
          <div style="position:absolute;top:14px;right:48px;width:32px;height:32px;pointer-events:none;opacity:0.35;">
            <div style="position:absolute;inset:0;border-radius:50%;"
                 [style.border]="'1px solid ' + selectedZone().accent"
                 style="animation:spin-slow 8s linear infinite;"></div>
            <div style="position:absolute;inset:6px;border-radius:50%;"
                 [style.border]="'1px solid ' + selectedZone().accent + '66'"></div>
            <div style="position:absolute;top:50%;left:0;right:0;height:1px;"
                 [style.background]="selectedZone().accent + '88'"></div>
            <div style="position:absolute;left:50%;top:0;bottom:0;width:1px;"
                 [style.background]="selectedZone().accent + '88'"></div>
          </div>

          <!-- Animated top edge -->
          <div style="position:absolute;top:0;left:0;right:0;height:2px;overflow:hidden;">
            <div style="position:absolute;top:0;left:0;right:0;height:2px;
                        background-image:repeating-linear-gradient(90deg,transparent 0,transparent 20px,rgba(255,255,255,0.6) 22px,transparent 24px);"
                 [style.backgroundImage]="'repeating-linear-gradient(90deg,transparent 0,transparent 44px,' + selectedZone().accent + ' 46px,transparent 50px)'"
                 style="animation:data-flow 1.8s linear infinite;">
            </div>
          </div>

          <div style="position:relative;z-index:1;">
            <div style="font-family:'IBM Plex Mono',monospace;font-size:8.5px;letter-spacing:0.22em;
                        text-transform:uppercase;opacity:0.5;margin-bottom:8px;"
                 [style.color]="selectedZone().accent">
              Time Travel Agency · Boarding Pass
            </div>
            <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;">
              <div style="font-family:'Fraunces',serif;font-size:21px;font-weight:500;line-height:1.25;flex:1;">
                {{ selectedTrip()!.tripName ?? 'Unnamed Expedition' }}
              </div>
              @if (selectedTrip()!.tripType === 'CriticalTrip') {
                <div style="background:rgba(224,90,78,0.2);border:1px solid rgba(224,90,78,0.5);
                            color:#E05A4E;font-size:8px;font-weight:700;padding:3px 8px;
                            border-radius:2px;letter-spacing:0.12em;white-space:nowrap;flex-shrink:0;
                            margin-left:10px;animation:led-blink 2s ease-in-out infinite;">⚠ CRITICAL</div>
              }
            </div>

            <!-- Route line -->
            <div style="display:flex;align-items:center;gap:8px;font-family:'IBM Plex Mono',monospace;
                        font-size:10.5px;color:#6B7488;">
              <span>NOW</span>
              <div style="flex:1;border-top:1px dashed rgba(255,255,255,0.1);"></div>
              <span style="font-size:11px;animation:led-blink 3s ease-in-out infinite;"
                    [style.color]="selectedZone().accent">✦</span>
              <div style="flex:1;border-top:1px dashed rgba(255,255,255,0.1);"></div>
              <span style="font-weight:600;" [style.color]="selectedZone().accent">
                {{ formatYear(selectedPinYear()) }}
              </span>
            </div>
            <div style="text-align:right;font-family:'IBM Plex Mono',monospace;font-size:8.5px;
                        margin-top:4px;opacity:0.4;" [style.color]="selectedZone().accent">
              {{ selectedZone().label.toUpperCase() }}
            </div>
          </div>
        </div>

        <!-- Card Body -->
        <div style="background:#080F1C;padding:16px 24px 20px;">

          <!-- Fact grid -->
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px 16px;margin-bottom:16px;
                      padding-bottom:16px;border-bottom:1px solid rgba(255,255,255,0.04);">
            @for (cell of factCells(); track cell.label) {
              <div style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.04);
                          border-radius:2px;padding:9px 11px;position:relative;overflow:hidden;">
                <div style="position:absolute;left:0;top:10%;bottom:10%;width:2px;border-radius:1px;"
                     [style.background]="selectedZone().accent + '55'"></div>
                <div style="font-family:'IBM Plex Mono',monospace;font-size:8px;color:#2E4060;
                            letter-spacing:0.1em;text-transform:uppercase;margin-bottom:4px;padding-left:6px;">
                  {{ cell.label }}
                </div>
                <div style="font-size:12.5px;padding-left:6px;" [style.color]="cell.color ?? '#B7BFCC'">
                  {{ cell.value }}
                </div>
              </div>
            }
          </div>

          <!-- Paradox exposure bar -->
          @if (selectedTrip()!.paradoxes.length > 0) {
            <div style="margin-bottom:16px;">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px;">
                <div style="font-family:'IBM Plex Mono',monospace;font-size:8px;color:#2E4060;
                            letter-spacing:0.1em;text-transform:uppercase;">Paradox Exposure</div>
                <div style="font-size:10px;color:#3E5068;">{{ selectedTrip()!.paradoxes.length }} incident{{ selectedTrip()!.paradoxes.length !== 1 ? 's' : '' }}</div>
              </div>
              <div style="height:4px;background:#0D1826;border-radius:2px;overflow:hidden;
                          border:1px solid rgba(255,255,255,0.04);">
                <div style="height:100%;border-radius:2px;transition:width 0.5s;"
                     [style.width.%]="Math.min(100, selectedTrip()!.paradoxes.length * 25)"
                     [style.background]="riskColors[selectedRisk()]"
                     [style.boxShadow]="'0 0 6px ' + riskColors[selectedRisk()]">
                </div>
              </div>
            </div>
          }

          <!-- Reviews -->
          @if (selectedTrip()!.reviews.length > 0) {
            <div style="margin-bottom:16px;padding-bottom:14px;border-bottom:1px solid rgba(255,255,255,0.04);
                        display:flex;align-items:center;justify-content:space-between;">
              <div style="font-family:'IBM Plex Mono',monospace;font-size:8px;color:#2E4060;
                          letter-spacing:0.1em;text-transform:uppercase;">Traveller Rating</div>
              <div style="display:flex;align-items:center;gap:6px;">
                <span style="color:#C9A84C;font-size:12px;">{{ starDisplay(selectedTrip()!.reviews) }}</span>
                <span style="font-size:10px;color:#3E5068;">({{ selectedTrip()!.reviews.length }})</span>
              </div>
            </div>
          }

          <!-- CTA -->
          @if (state.isCustomer()) {
            <div style="margin-bottom:10px;">
              @if (bookedGuids().includes(selectedTrip()!.guid) || justBooked()) {
                <button disabled class="booking-btn"
                        style="width:100%;padding:13px;border-radius:3px;font-weight:600;font-size:13.5px;
                               background:#0A1812;border:1px solid rgba(63,174,121,0.3);
                               color:#3FAE79;cursor:not-allowed;display:flex;align-items:center;
                               justify-content:center;gap:8px;">
                  <span style="font-size:16px;">✓</span> Seat Confirmed
                </button>
              } @else if (selectedTrip()!.tripStatus !== 'Active') {
                <button disabled class="booking-btn"
                        style="width:100%;padding:13px;border-radius:3px;font-weight:600;font-size:13.5px;
                               background:#0C1018;border:1px dashed #1E2A3A;color:#3E5068;cursor:not-allowed;">
                  {{ selectedTrip()!.tripStatus }} — Unavailable
                </button>
              } @else if (!isBookable(selectedTrip()!)) {
                <button disabled class="booking-btn"
                        style="width:100%;padding:13px;border-radius:3px;font-weight:600;font-size:13.5px;
                               background:rgba(217,162,78,0.07);border:1px solid rgba(217,162,78,0.2);
                               color:#D9A24E;cursor:not-allowed;">
                  Boarding Closed · Departs Soon
                </button>
              } @else {
                <button (click)="bookSelectedTrip()" [disabled]="booking()" class="booking-btn"
                        style="width:100%;padding:13px;border-radius:3px;font-weight:700;font-size:13.5px;
                               border:none;cursor:pointer;letter-spacing:0.04em;position:relative;overflow:hidden;"
                        [style.background]="booking() ? selectedZone().accent + 'AA' : selectedZone().accent"
                        [style.color]="'#060A12'"
                        [style.boxShadow]="'0 0 20px ' + selectedZone().accent + '55'">
                  {{ booking() ? 'Reserving Coordinates…' : 'Book this Journey →' }}
                </button>
              }
              @if (bookingError()) {
                <div style="color:#E05A4E;font-size:11.5px;margin-top:8px;text-align:center;">
                  {{ bookingError() }}
                </div>
              }
            </div>
          }

          <div style="text-align:center;">
            <span class="itinerary-link"
                  (click)="viewDetail(selectedTrip()!.guid)"
                  style="font-family:'IBM Plex Mono',monospace;font-size:11px;color:#3E5068;cursor:pointer;
                         text-decoration:underline;text-underline-offset:3px;letter-spacing:0.04em;">
              Full itinerary & mission details →
            </span>
          </div>
        </div>

        <!-- Close -->
        <button class="close-btn"
                (click)="closeCard()"
                style="position:absolute;top:10px;right:10px;width:26px;height:26px;
                       background:rgba(5,10,18,0.75);border:1px solid rgba(255,255,255,0.08);
                       color:#6B7488;border-radius:50%;cursor:pointer;font-size:15px;
                       display:flex;align-items:center;justify-content:center;line-height:1;">
          ×
        </button>
      </div>
    </div>
  }

  <!-- ── Loading ────────────────────────────────────────────────────── -->
  @if (loading()) {
    <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
                background:#030508;z-index:50;">
      <div style="text-align:center;">
        <div style="width:48px;height:48px;border-radius:50%;border:2px solid #1E2A3A;
                    border-top-color:#C9A84C;margin:0 auto 20px;
                    animation:spin-slow 1s linear infinite;">
        </div>
        <div style="font-family:'IBM Plex Mono',monospace;font-size:10px;color:#3E5068;
                    letter-spacing:0.32em;">INITIALIZING CONTINUUM</div>
      </div>
    </div>
  }

</div>
  `,
})
export class EraTimelineComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly tripSvc = inject(TripService);
  private readonly agentSvc = inject(AgentService);
  private readonly router = inject(Router);
  protected readonly state = inject(AppStateService);

  private readonly scrollEl = viewChild<ElementRef<HTMLElement>>('scrollEl');
  private readonly scrubberTrack = viewChild<ElementRef<HTMLElement>>('scrubberTrack');
  private readonly starCanvas = viewChild<ElementRef<HTMLCanvasElement>>('starCanvas');
  private rafId: number | null = null;

  // ── State signals ──────────────────────────────────────────────────
  readonly loading = signal(true);
  private readonly trips = signal<TripDto[]>([]);
  private readonly agentMap = signal<Map<number, AgentDto>>(new Map());

  readonly scrollX = signal(0);
  readonly selectedTripGuid = signal<string | null>(null);
  readonly hoverPin = signal<string | null>(null);
  readonly bookedGuids = signal<string[]>([]);
  readonly booking = signal(false);
  readonly bookingError = signal('');
  readonly justBooked = signal(false);

  // ── Constants ──────────────────────────────────────────────────────
  readonly eraZones = ERA_ZONES;
  readonly zoneWidth = ZONE_W;
  readonly totalWidth = TOTAL_W;
  readonly spinePct = SPINE_PCT;
  readonly riskColors = RISK_COLORS;
  readonly riskLabels = RISK_LABELS;
  readonly Math = Math;

  // ── Computed ───────────────────────────────────────────────────────
  readonly pins = computed((): TripPin[] => {
    const map = this.agentMap();
    return this.trips().map((trip, i) => {
      const year = tripDestYear(trip, map);
      const x = yearToPx(year);
      const stemHeight = 28 + (i % 4) * 18;
      return {
        trip, year, x,
        zone: zoneForPx(x),
        stemHeight,
        isCritical: trip.tripType === 'CriticalTrip',
        risk: riskLevel(trip),
        signalBars: stemHeight <= 46 ? 1 : stemHeight <= 64 ? 2 : 3,
      };
    });
  });

  readonly yearTicks = computed(() => {
    const ticks = [
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
    return ticks
      .filter(t => t.year >= ERA_ZONES[0].startYear && t.year <= ERA_ZONES[ERA_ZONES.length - 1].endYear)
      .map(t => ({ px: yearToPx(t.year), label: t.label, year: t.year }));
  });

  readonly activeZone = computed((): EraZone => {
    const vw = (typeof window !== 'undefined' ? window.innerWidth : 1200);
    return zoneForPx(Math.max(0, this.scrollX() + vw / 2));
  });

  readonly currentYear = computed((): number => {
    const vw = (typeof window !== 'undefined' ? window.innerWidth : 1200);
    const px = Math.max(0, this.scrollX() + vw / 2);
    const zone = zoneForPx(px);
    const t = (px - zone.pxStart) / ZONE_W;
    return Math.round(zone.startYear + t * (zone.endYear - zone.startYear));
  });

  readonly scrubberLeft = computed((): number => (this.scrollX() / TOTAL_W) * 100);
  readonly scrubberWidth = computed((): number => {
    const vw = (typeof window !== 'undefined' ? window.innerWidth : 1200);
    return (vw / TOTAL_W) * 100;
  });

  readonly selectedTrip = computed((): TripDto | null => {
    const g = this.selectedTripGuid();
    return g ? (this.trips().find(t => t.guid === g) ?? null) : null;
  });

  readonly selectedPinYear = computed((): number => {
    const g = this.selectedTripGuid();
    return this.pins().find(p => p.trip.guid === g)?.year ?? 0;
  });

  readonly selectedZone = computed((): EraZone => {
    const g = this.selectedTripGuid();
    return this.pins().find(p => p.trip.guid === g)?.zone ?? ERA_ZONES[0];
  });

  readonly selectedRisk = computed((): 'low' | 'elevated' | 'critical' => {
    const t = this.selectedTrip();
    return t ? riskLevel(t) : 'low';
  });

  readonly factCells = computed(() => {
    const t = this.selectedTrip();
    if (!t) return [];
    const zone = this.selectedZone();
    return [
      { label: 'Departure', value: this.formatDate(t.dateInRealLife) },
      { label: 'Status', value: t.tripStatus, color: this.statusColor(t.tripStatus) },
      { label: 'Travellers', value: `${t.customers.length} aboard` },
      { label: 'Paradox Risk', value: RISK_LABELS[riskLevel(t)], color: RISK_COLORS[riskLevel(t)] },
    ];
  });

  // ── Lifecycle ──────────────────────────────────────────────────────
  ngOnInit(): void {
    forkJoin({ trips: this.tripSvc.getAll(), agents: this.agentSvc.getAll() }).subscribe({
      next: ({ trips, agents }) => {
        const map = new Map<number, AgentDto>();
        agents.forEach(a => map.set(a.id, a));
        this.agentMap.set(map);
        this.trips.set(trips);
        this.loading.set(false);
        setTimeout(() => this.scrollToFirstPin(), 80);
      },
      error: () => this.loading.set(false),
    });
  }

  ngAfterViewInit(): void {
    this.initStarfield();
  }

  ngOnDestroy(): void {
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
  }

  private initStarfield(): void {
    const canvasEl = this.starCanvas()?.nativeElement;
    if (!canvasEl) return;

    const resize = () => {
      canvasEl.width = canvasEl.offsetWidth;
      canvasEl.height = canvasEl.offsetHeight;
    };
    resize();
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

  private scrollToFirstPin(): void {
    const el = this.scrollEl()?.nativeElement;
    if (!el || this.pins().length === 0) return;
    const sorted = [...this.pins()].sort((a, b) => Math.abs(a.year - 1500) - Math.abs(b.year - 1500));
    const target = sorted[0];
    const vw = el.clientWidth;
    el.scrollTo({ left: Math.max(0, target.x - vw / 2), behavior: 'smooth' });
  }

  // ── Event handlers ─────────────────────────────────────────────────
  onScroll(event: Event): void {
    this.scrollX.set((event.target as HTMLElement).scrollLeft);
  }

  jumpToZone(zone: EraZone): void {
    const el = this.scrollEl()?.nativeElement;
    if (!el) return;
    el.scrollTo({ left: Math.max(0, zone.pxStart + ZONE_W / 2 - el.clientWidth / 2), behavior: 'smooth' });
  }

  onScrubberClick(event: MouseEvent): void {
    const track = this.scrubberTrack()?.nativeElement;
    const scroll = this.scrollEl()?.nativeElement;
    if (!track || !scroll) return;
    const rect = track.getBoundingClientRect();
    const t = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    scroll.scrollTo({ left: t * TOTAL_W, behavior: 'smooth' });
  }

  selectPin(event: MouseEvent, pin: TripPin): void {
    event.stopPropagation();
    if (this.selectedTripGuid() === pin.trip.guid) { this.closeCard(); return; }
    this.selectedTripGuid.set(pin.trip.guid);
    this.bookingError.set('');
    this.justBooked.set(false);
    const el = this.scrollEl()?.nativeElement;
    if (el) el.scrollTo({ left: Math.max(0, pin.x - el.clientWidth * 0.3), behavior: 'smooth' });
  }

  closeCard(): void {
    this.selectedTripGuid.set(null);
    this.bookingError.set('');
    this.justBooked.set(false);
  }

  isBookable(trip: TripDto): boolean {
    return isBookingOpen(trip.dateInRealLife) && !isDeparted(trip.dateInRealLife);
  }

  bookSelectedTrip(): void {
    const trip = this.selectedTrip();
    if (!trip) return;
    const customer = this.state.currentCustomer();
    if (!customer) { this.state.requestRole('customer'); return; }
    this.booking.set(true);
    this.bookingError.set('');
    this.tripSvc.bookTrip(trip.guid, customer.guid).subscribe({
      next: () => {
        this.booking.set(false);
        this.justBooked.set(true);
        this.bookedGuids.update(g => [...g, trip.guid]);
      },
      error: (err) => {
        this.booking.set(false);
        this.bookingError.set(err?.error ?? 'Booking failed. Please try again.');
      },
    });
  }

  viewDetail(guid: string): void {
    this.router.navigate(['/trip', guid]);
  }

  // ── Template helpers ───────────────────────────────────────────────
  formatYear(year: number): string { return formatYear(year); }
  formatDate(iso: string): string { return formatDateOnly(iso); }
  zoneForYear(year: number): EraZone { return zoneForPx(yearToPx(year)); }

  statusColor(status: string): string {
    const map: Record<string, string> = { Active: '#5B8DC9', Completed: '#8A93A6', Cancelled: '#B5574A' };
    return map[status] ?? '#8A93A6';
  }

  starDisplay(reviews: { stars: number }[]): string {
    if (!reviews.length) return '';
    const avg = reviews.reduce((s, r) => s + r.stars, 0) / reviews.length;
    return `★ ${avg.toFixed(1)}`;
  }
}
