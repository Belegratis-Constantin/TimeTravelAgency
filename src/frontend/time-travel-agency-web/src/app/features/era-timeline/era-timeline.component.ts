import {
  Component, OnInit, inject, signal, computed, ElementRef, viewChild
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
  // Deterministic hash fallback: map GUID → year in -2500..2500
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
    @keyframes fade-in-up {
      from { opacity: 0; transform: translateY(10px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    .timeline-scroll::-webkit-scrollbar { display: none; }
    .timeline-scroll { scrollbar-width: none; -ms-overflow-style: none; }

    .era-chip { transition: opacity 0.2s, border-color 0.2s, color 0.2s; }
    .era-chip:hover { opacity: 1 !important; }

    .pin-head { transition: transform 0.15s cubic-bezier(.34,1.56,.64,1), box-shadow 0.15s; }

    .booking-btn { transition: filter 0.15s, transform 0.1s; }
    .booking-btn:hover:not([disabled]) { filter: brightness(1.12); }
    .booking-btn:active:not([disabled]) { transform: scale(0.97); }

    .card-enter { animation: fade-in-up 0.22s ease forwards; }

    .hover-stub { animation: fade-in-up 0.12s ease forwards; }

    .itinerary-link { transition: color 0.15s; }
    .itinerary-link:hover { color: #F0EDE6 !important; }

    .close-btn { transition: background 0.15s, color 0.15s; }
    .close-btn:hover { background: rgba(255,255,255,0.12) !important; color: #F0EDE6 !important; }

    .scrubber-btn { transition: background 0.15s; }
    .scrubber-btn:hover { background: rgba(255,255,255,0.06) !important; }
  `],
  template: `
<div style="position:relative;height:calc(100vh - 65px);overflow:hidden;background:#0B0E14;user-select:none;">

  <!-- ── Era Jump Chips ─────────────────────────────────────────────── -->
  <div style="position:absolute;top:16px;left:50%;transform:translateX(-50%);
              display:flex;gap:7px;z-index:20;flex-wrap:wrap;justify-content:center;
              padding:0 20px;pointer-events:all;">
    @for (zone of eraZones; track zone.name) {
      <button class="era-chip"
              (click)="jumpToZone(zone)"
              [style.opacity]="activeZone().name === zone.name ? '1' : '0.38'"
              [style.borderColor]="activeZone().name === zone.name ? zone.accent : 'rgba(255,255,255,0.1)'"
              [style.color]="activeZone().name === zone.name ? zone.accent : '#6B7488'"
              [style.background]="activeZone().name === zone.name ? zone.accent + '14' : 'rgba(11,14,20,0.8)'"
              style="border:1px solid;padding:4px 12px;border-radius:20px;
                     font-size:10.5px;font-family:'IBM Plex Mono',monospace;
                     letter-spacing:0.05em;cursor:pointer;backdrop-filter:blur(8px);">
        {{ zone.shortLabel }}
      </button>
    }
  </div>

  <!-- ── Scrollable Timeline ────────────────────────────────────────── -->
  <div class="timeline-scroll" #scrollEl
       (scroll)="onScroll($event)"
       style="position:absolute;inset:0;padding-bottom:36px;
              overflow-x:auto;overflow-y:hidden;cursor:grab;-webkit-overflow-scrolling:touch;">

    <div [style.width.px]="totalWidth"
         style="height:100%;position:relative;">

      <!-- Zone Bands -->
      @for (zone of eraZones; track zone.name; let zi = $index) {
        <div style="position:absolute;top:0;bottom:0;"
             [style.left.px]="zone.pxStart"
             [style.width.px]="zoneWidth"
             [style.background]="zone.bg">

          <!-- Subtle noise overlay via radial pattern -->
          <div style="position:absolute;inset:0;opacity:0.03;"
               [style.backgroundImage]="'radial-gradient(' + zone.accent + ' 1px, transparent 1px)'"
               style="background-size:24px 24px;pointer-events:none;">
          </div>

          <!-- Zone boundary seam -->
          @if (zi < eraZones.length - 1) {
            <div style="position:absolute;right:0;top:10%;bottom:10%;width:1px;pointer-events:none;
                        background:linear-gradient(to bottom,transparent,rgba(255,255,255,0.07) 30%,rgba(255,255,255,0.07) 70%,transparent);">
            </div>
          }

          <!-- Era giant background label -->
          <div style="position:absolute;top:50%;transform:translateY(-56%);
                      left:0;right:0;text-align:center;pointer-events:none;overflow:hidden;">
            <div style="font-family:'Fraunces',serif;font-size:clamp(56px,8vw,100px);
                        font-weight:700;font-style:italic;line-height:1;
                        letter-spacing:-0.02em;white-space:nowrap;opacity:0.04;"
                 [style.color]="zone.accent">
              {{ zone.label.toUpperCase() }}
            </div>
          </div>

          <!-- Zone year range label (subtle, at bottom of zone) -->
          <div style="position:absolute;bottom:52px;left:0;right:0;
                      text-align:center;pointer-events:none;">
            <div style="font-family:'IBM Plex Mono',monospace;font-size:9.5px;
                        letter-spacing:0.25em;opacity:0.18;"
                 [style.color]="zone.accent">
              {{ formatYear(zone.startYear) }} — {{ formatYear(zone.endYear) }}
            </div>
          </div>
        </div>
      }

      <!-- Spine -->
      <div style="position:absolute;left:0;right:0;height:3px;pointer-events:none;z-index:2;"
           [style.top.%]="spinePct">
        @for (zone of eraZones; track zone.name) {
          <div style="position:absolute;top:0;height:3px;"
               [style.left.px]="zone.pxStart"
               [style.width.px]="zoneWidth"
               [style.background]="'linear-gradient(to right, ' + zone.accent + '55, ' + zone.accent + 'CC 30%, ' + zone.accent + 'CC 70%, ' + zone.accent + '55)'">
          </div>
        }
        <!-- Year ticks -->
        @for (tick of yearTicks(); track tick.px) {
          <div style="position:absolute;top:-16px;display:flex;flex-direction:column;align-items:center;pointer-events:none;"
               [style.left.px]="tick.px - 1">
            <div style="font-family:'IBM Plex Mono',monospace;font-size:8px;color:#2A3A50;
                        white-space:nowrap;margin-bottom:3px;">{{ tick.label }}</div>
            <div style="width:1px;height:8px;background:#2A3A50;"></div>
          </div>
        }
      </div>

      <!-- Trip Pins -->
      @for (pin of pins(); track pin.trip.guid) {
        <div style="position:absolute;display:flex;flex-direction:column;align-items:center;
                    cursor:pointer;z-index:5;transition:opacity 0.2s;"
             [style.left.px]="pin.x - 8"
             [style.top.%]="spinePct"
             [style.marginTop.px]="-(pin.stemHeight + 20)"
             [style.opacity]="selectedTripGuid() && selectedTripGuid() !== pin.trip.guid ? '0.35' : '1'"
             (click)="selectPin($event, pin)"
             (mouseenter)="hoverPin.set(pin.trip.guid)"
             (mouseleave)="hoverPin.set(null)">

          <!-- Hover stub -->
          @if (hoverPin() === pin.trip.guid && selectedTripGuid() !== pin.trip.guid) {
            <div class="hover-stub"
                 style="position:absolute;bottom:calc(100% + 14px);left:50%;transform:translateX(-50%);
                        width:210px;background:#12192A;border:1px solid;border-radius:5px;
                        padding:13px 15px;pointer-events:none;z-index:15;
                        box-shadow:0 12px 40px rgba(0,0,0,0.6);"
                 [style.borderColor]="pin.zone.accent + '40'">
              <!-- Accent left border -->
              <div style="position:absolute;left:0;top:10%;bottom:10%;width:2px;border-radius:1px;"
                   [style.background]="pin.zone.accent + '66'">
              </div>
              <div style="padding-left:8px;">
                <div style="font-family:'Fraunces',serif;font-size:14px;font-weight:500;
                            margin-bottom:5px;line-height:1.3;">
                  {{ pin.trip.tripName ?? 'Unnamed Expedition' }}
                </div>
                <div style="font-family:'IBM Plex Mono',monospace;font-size:10px;margin-bottom:5px;"
                     [style.color]="pin.zone.accent">
                  Δ {{ formatYear(pin.year) }} · {{ pin.zone.shortLabel }}
                </div>
                <div style="font-size:11px;color:#8A93A6;margin-bottom:4px;">
                  Departs {{ formatDate(pin.trip.dateInRealLife) }}
                </div>
                <div style="display:flex;justify-content:space-between;align-items:center;">
                  <span style="font-size:10.5px;font-weight:600;"
                        [style.color]="riskColors[pin.risk]">
                    {{ riskLabels[pin.risk] }}
                  </span>
                  <span style="font-size:10px;color:#4E5E74;">
                    {{ pin.trip.customers.length }} booked
                  </span>
                </div>
              </div>
            </div>
          }

          <!-- Pin head (diamond) -->
          <div class="pin-head"
               [style.width.px]="selectedTripGuid() === pin.trip.guid ? 20 : 15"
               [style.height.px]="selectedTripGuid() === pin.trip.guid ? 20 : 15"
               [style.background]="selectedTripGuid() === pin.trip.guid ? '#ffffff' : pin.zone.accent"
               [style.boxShadow]="selectedTripGuid() === pin.trip.guid
                 ? '0 0 24px 8px ' + pin.zone.accent + ', 0 0 48px 4px ' + pin.zone.accent + '44'
                 : '0 0 10px 2px ' + pin.zone.accent + '99' + (pin.isCritical ? ', 0 0 18px 4px #E8590C66' : '')"
               style="transform:rotate(45deg);border-radius:2px;flex-shrink:0;">
          </div>

          <!-- Pulse ring (active/bookable trips) -->
          @if (pin.trip.tripStatus === 'Active' && selectedTripGuid() !== pin.trip.guid) {
            <div style="position:absolute;top:50%;left:50%;
                        width:15px;height:15px;border-radius:50%;border:1.5px solid;
                        pointer-events:none;"
                 [style.borderColor]="pin.zone.accent"
                 [style.animation]="'pulse-ring ' + (pin.isCritical ? '1.4s' : '2.2s') + ' ease-out infinite'">
            </div>
          }

          <!-- Stem -->
          <div style="width:2px;flex-shrink:0;"
               [style.height.px]="pin.stemHeight"
               [style.background]="'linear-gradient(to bottom, ' + pin.zone.accent + 'BB, ' + pin.zone.accent + '22)'">
          </div>

          <!-- Anchor dot on spine -->
          <div style="width:7px;height:7px;border-radius:50%;flex-shrink:0;"
               [style.background]="pin.zone.accent"
               [style.boxShadow]="'0 0 10px 3px ' + pin.zone.accent + '77'">
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

  <!-- ── Minimap Scrubber ───────────────────────────────────────────── -->
  <div style="position:absolute;bottom:0;left:0;right:0;height:36px;z-index:20;
              background:rgba(9,11,17,0.92);border-top:1px solid #141E2E;
              display:flex;align-items:center;gap:10px;padding:0 18px;backdrop-filter:blur(4px);">

    <div style="font-family:'IBM Plex Mono',monospace;font-size:9px;color:#2A3A50;
                letter-spacing:0.15em;white-space:nowrap;">CONTINUUM</div>

    <div #scrubberTrack
         style="flex:1;height:6px;border-radius:3px;position:relative;cursor:pointer;overflow:hidden;
                background:rgba(255,255,255,0.04);"
         (click)="onScrubberClick($event)">

      @for (zone of eraZones; track zone.name) {
        <div style="position:absolute;top:0;height:100%;"
             [style.left.%]="(zone.pxStart / totalWidth) * 100"
             [style.width.%]="(zoneWidth / totalWidth) * 100"
             [style.background]="zone.accent + '44'">
        </div>
      }

      @for (pin of pins(); track pin.trip.guid) {
        <div style="position:absolute;top:50%;transform:translateY(-50%);
                    width:3px;height:3px;border-radius:50%;pointer-events:none;"
             [style.left.%]="(pin.x / totalWidth) * 100"
             [style.background]="pin.zone.accent">
        </div>
      }

      <!-- Viewport window handle -->
      <div style="position:absolute;top:0;bottom:0;border:1px solid rgba(255,255,255,0.25);
                  border-radius:2px;pointer-events:none;background:rgba(255,255,255,0.05);"
           [style.left.%]="scrubberLeft()"
           [style.width.%]="scrubberWidth()">
      </div>
    </div>

    <div style="font-family:'IBM Plex Mono',monospace;font-size:9px;white-space:nowrap;
                min-width:80px;text-align:right;"
         [style.color]="activeZone().accent + 'AA'">
      {{ formatYear(currentYear()) }}
    </div>
  </div>

  <!-- ── Boarding Card Overlay ─────────────────────────────────────── -->
  @if (selectedTrip()) {
    <div style="position:absolute;inset:0;z-index:30;pointer-events:all;"
         (click)="closeCard()">
      <div class="card-enter"
           (click)="$event.stopPropagation()"
           style="position:absolute;top:60px;right:36px;width:390px;border-radius:7px;
                  overflow:hidden;box-shadow:0 28px 90px rgba(0,0,0,0.75),0 0 0 1px rgba(255,255,255,0.04);">

        <!-- Header band (era themed) -->
        <div style="padding:22px 24px 16px;position:relative;"
             [style.background]="selectedZone().bg">
          <!-- Ambient glow in corner -->
          <div style="position:absolute;top:-20px;right:-20px;width:120px;height:120px;
                      border-radius:50%;pointer-events:none;opacity:0.25;"
               [style.background]="'radial-gradient(' + selectedZone().accent + ', transparent 70%)'">
          </div>

          <div style="display:flex;justify-content:space-between;align-items:flex-start;
                      position:relative;z-index:1;">
            <div style="font-family:'IBM Plex Mono',monospace;font-size:9px;letter-spacing:0.22em;
                        text-transform:uppercase;opacity:0.55;margin-bottom:8px;"
                 [style.color]="selectedZone().accent">
              Time Travel Agency · Boarding Pass
            </div>
            @if (selectedTrip()!.tripType === 'CriticalTrip') {
              <div style="background:rgba(217,162,78,0.2);border:1px solid rgba(217,162,78,0.45);
                          color:#D9A24E;font-size:8.5px;font-weight:700;padding:2px 8px;
                          border-radius:2px;letter-spacing:0.12em;white-space:nowrap;">⚠ CRITICAL</div>
            }
          </div>

          <div style="font-family:'Fraunces',serif;font-size:21px;font-weight:500;
                      line-height:1.25;margin-bottom:10px;position:relative;z-index:1;">
            {{ selectedTrip()!.tripName ?? 'Unnamed Expedition' }}
          </div>

          <!-- Route line -->
          <div style="display:flex;align-items:center;gap:8px;font-family:'IBM Plex Mono',monospace;
                      font-size:10.5px;color:#6B7488;position:relative;z-index:1;">
            <span>NOW</span>
            <div style="flex:1;border-top:1px dashed rgba(255,255,255,0.1);"></div>
            <span style="font-size:11px;">✦</span>
            <div style="flex:1;border-top:1px dashed rgba(255,255,255,0.1);"></div>
            <span style="font-weight:600;" [style.color]="selectedZone().accent">
              {{ formatYear(selectedPinYear()) }}
            </span>
          </div>
          <div style="text-align:right;font-family:'IBM Plex Mono',monospace;font-size:9px;
                      margin-top:4px;opacity:0.45;position:relative;z-index:1;"
               [style.color]="selectedZone().accent">
            {{ selectedZone().label }}
          </div>
        </div>

        <!-- Card Body -->
        <div style="background:#0D1520;padding:16px 24px 20px;">

          <!-- Fact grid -->
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px 20px;margin-bottom:16px;
                      padding-bottom:16px;border-bottom:1px solid #1E2A3A;">
            <div>
              <div style="font-size:9px;color:#3E5068;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:3px;">Departure</div>
              <div style="font-size:12.5px;color:#B7BFCC;">{{ formatDate(selectedTrip()!.dateInRealLife) }}</div>
            </div>
            <div>
              <div style="font-size:9px;color:#3E5068;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:3px;">Status</div>
              <div style="font-size:12px;font-weight:600;"
                   [style.color]="statusColor(selectedTrip()!.tripStatus)">
                {{ selectedTrip()!.tripStatus }}
              </div>
            </div>
            <div>
              <div style="font-size:9px;color:#3E5068;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:3px;">Travelers</div>
              <div style="font-size:12.5px;color:#B7BFCC;">{{ selectedTrip()!.customers.length }} aboard</div>
            </div>
            <div>
              <div style="font-size:9px;color:#3E5068;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:3px;">Paradox Risk</div>
              <div style="font-size:12px;font-weight:600;" [style.color]="riskColors[selectedRisk()]">
                {{ riskLabels[selectedRisk()] }}
                @if (selectedTrip()!.paradoxes.length > 0) {
                  <span style="font-size:10px;color:#4E5E74;font-weight:400;">
                    ({{ selectedTrip()!.paradoxes.length }})
                  </span>
                }
              </div>
            </div>
          </div>

          <!-- Paradox risk bar -->
          @if (selectedTrip()!.paradoxes.length > 0) {
            <div style="margin-bottom:16px;">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px;">
                <div style="font-size:9px;color:#3E5068;letter-spacing:0.1em;text-transform:uppercase;">Paradox Exposure</div>
                <div style="font-size:10px;color:#4E5E74;">{{ selectedTrip()!.paradoxes.length }} incident{{ selectedTrip()!.paradoxes.length !== 1 ? 's' : '' }}</div>
              </div>
              <div style="height:4px;background:#1E2A3A;border-radius:2px;overflow:hidden;">
                <div style="height:100%;border-radius:2px;transition:width 0.5s;"
                     [style.width.%]="Math.min(100, selectedTrip()!.paradoxes.length * 25)"
                     [style.background]="riskColors[selectedRisk()]">
                </div>
              </div>
            </div>
          }

          <!-- Reviews -->
          @if (selectedTrip()!.reviews.length > 0) {
            <div style="margin-bottom:16px;padding-bottom:16px;border-bottom:1px solid #1E2A3A;
                        display:flex;align-items:center;justify-content:space-between;">
              <div style="font-size:9px;color:#3E5068;letter-spacing:0.1em;text-transform:uppercase;">Traveler Rating</div>
              <div style="display:flex;align-items:center;gap:6px;">
                <span style="color:#C9A84C;font-size:12px;">{{ starDisplay(selectedTrip()!.reviews) }}</span>
                <span style="font-size:11px;color:#4E5E74;">({{ selectedTrip()!.reviews.length }})</span>
              </div>
            </div>
          }

          <!-- CTA -->
          @if (state.isCustomer()) {
            <div style="margin-bottom:10px;">
              @if (bookedGuids().includes(selectedTrip()!.guid) || justBooked()) {
                <button disabled class="booking-btn"
                        style="width:100%;padding:13px;border-radius:4px;font-weight:600;font-size:13.5px;
                               background:#0E1A12;border:1px solid rgba(63,174,121,0.3);
                               color:#3FAE79;cursor:not-allowed;display:flex;align-items:center;
                               justify-content:center;gap:8px;">
                  <span style="font-size:16px;">✓</span> Seat Confirmed
                </button>
              } @else if (selectedTrip()!.tripStatus !== 'Active') {
                <button disabled class="booking-btn"
                        style="width:100%;padding:13px;border-radius:4px;font-weight:600;font-size:13.5px;
                               background:#121820;border:1px dashed #2E3E54;color:#4E5E74;cursor:not-allowed;">
                  {{ selectedTrip()!.tripStatus }} — Unavailable
                </button>
              } @else if (!isBookable(selectedTrip()!)) {
                <button disabled class="booking-btn"
                        style="width:100%;padding:13px;border-radius:4px;font-weight:600;font-size:13.5px;
                               background:rgba(217,162,78,0.08);border:1px solid rgba(217,162,78,0.25);
                               color:#D9A24E;cursor:not-allowed;">
                  Boarding Closed · Departs Soon
                </button>
              } @else {
                <button (click)="bookSelectedTrip()" [disabled]="booking()" class="booking-btn"
                        style="width:100%;padding:13px;border-radius:4px;font-weight:700;font-size:13.5px;
                               border:none;cursor:pointer;letter-spacing:0.02em;"
                        [style.background]="booking() ? selectedZone().accent + 'AA' : selectedZone().accent"
                        [style.color]="'#0B1120'">
                  {{ booking() ? 'Reserving…' : 'Book this Journey →' }}
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
                  style="font-size:12px;color:#4E5E74;cursor:pointer;
                         text-decoration:underline;text-underline-offset:3px;">
              Full itinerary & details →
            </span>
          </div>
        </div>

        <!-- Close -->
        <button class="close-btn"
                (click)="closeCard()"
                style="position:absolute;top:10px;right:10px;width:26px;height:26px;
                       background:rgba(11,14,20,0.7);border:1px solid rgba(255,255,255,0.08);
                       color:#6B7488;border-radius:50%;cursor:pointer;font-size:15px;
                       display:flex;align-items:center;justify-content:center;line-height:1;">
          ×
        </button>
      </div>
    </div>
  }

  <!-- ── Loading Overlay ────────────────────────────────────────────── -->
  @if (loading()) {
    <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
                background:#0B0E14;z-index:50;">
      <div style="text-align:center;">
        <div style="width:48px;height:48px;border-radius:50%;border:2px solid #1E2A3A;
                    border-top-color:#C9A84C;margin:0 auto 20px;
                    animation:spin-slow 1s linear infinite;">
        </div>
        <div style="font-family:'IBM Plex Mono',monospace;font-size:10.5px;color:#3E5068;
                    letter-spacing:0.3em;">INITIALIZING CONTINUUM</div>
      </div>
    </div>
  }

</div>
  `,
})
export class EraTimelineComponent implements OnInit {
  private readonly tripSvc = inject(TripService);
  private readonly agentSvc = inject(AgentService);
  private readonly router = inject(Router);
  protected readonly state = inject(AppStateService);

  private readonly scrollEl = viewChild<ElementRef<HTMLElement>>('scrollEl');
  private readonly scrubberTrack = viewChild<ElementRef<HTMLElement>>('scrubberTrack');

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

  // ── Constants (exposed for template) ──────────────────────────────
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
      return {
        trip,
        year,
        x,
        zone: zoneForPx(x),
        stemHeight: 28 + (i % 4) * 16,
        isCritical: trip.tripType === 'CriticalTrip',
        risk: riskLevel(trip),
      };
    });
  });

  readonly yearTicks = computed(() => {
    // A small set of iconic years to mark on the spine
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
      .map(t => ({ px: yearToPx(t.year), label: t.label }));
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

  // ── Lifecycle ──────────────────────────────────────────────────────
  ngOnInit(): void {
    forkJoin({ trips: this.tripSvc.getAll(), agents: this.agentSvc.getAll() }).subscribe(({ trips, agents }) => {
      const map = new Map<number, AgentDto>();
      agents.forEach(a => map.set(a.id, a));
      this.agentMap.set(map);
      this.trips.set(trips);
      this.loading.set(false);
      // Auto-scroll to earliest future trip after a tick
      setTimeout(() => this.scrollToFirstPin(), 80);
    });
  }

  private scrollToFirstPin(): void {
    const el = this.scrollEl()?.nativeElement;
    if (!el || this.pins().length === 0) return;
    // Find pin closest to contemporary zone (most likely where seeded trips live)
    const sorted = [...this.pins()].sort((a, b) => {
      const da = Math.abs(a.year - 1500);
      const db = Math.abs(b.year - 1500);
      return da - db;
    });
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
    const targetX = zone.pxStart + ZONE_W / 2 - el.clientWidth / 2;
    el.scrollTo({ left: Math.max(0, targetX), behavior: 'smooth' });
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
    if (this.selectedTripGuid() === pin.trip.guid) {
      this.closeCard();
      return;
    }
    this.selectedTripGuid.set(pin.trip.guid);
    this.bookingError.set('');
    this.justBooked.set(false);

    const el = this.scrollEl()?.nativeElement;
    if (el) {
      const vw = el.clientWidth;
      el.scrollTo({ left: Math.max(0, pin.x - vw * 0.3), behavior: 'smooth' });
    }
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
    if (!customer) {
      this.state.requestRole('customer');
      return;
    }
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
