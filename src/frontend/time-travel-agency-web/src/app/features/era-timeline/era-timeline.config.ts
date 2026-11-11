import { TripDto } from '../../core/models/trip.model';
import { AgentDto } from '../../core/models/agent.model';

export type Phase = 'open' | 'underway' | 'closed';

// ─── Era Zone Definitions ─────────────────────────────────────────────────────

export interface EraZone {
  name: string;
  label: string;
  shortLabel: string;
  startYear: number;
  endYear: number;
  accent: string;
  bg: string;
  pxStart: number;
}

export const ZONE_W = 1800;

export const ERA_ZONES: EraZone[] = [
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

export const TOTAL_W = ZONE_W * ERA_ZONES.length;
export const SPINE_PCT = 62;

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function yearToPx(year: number): number {
  let zone = ERA_ZONES.find(z => year >= z.startYear && year < z.endYear);
  if (!zone) zone = year < ERA_ZONES[0].startYear ? ERA_ZONES[0] : ERA_ZONES[ERA_ZONES.length - 1];
  const t = Math.max(0, Math.min(1, (year - zone.startYear) / (zone.endYear - zone.startYear)));
  return zone.pxStart + t * ZONE_W;
}

export function zoneForPx(px: number): EraZone {
  return ERA_ZONES.find(z => px >= z.pxStart && px < z.pxStart + ZONE_W) ?? ERA_ZONES[ERA_ZONES.length - 1];
}

export function tripDestYear(trip: TripDto, agentMap: Map<number, AgentDto>): number {
  const epoch = agentMap.get(trip.licensedAgentId)?.specialisationEpochId;
  if (epoch?.startYear !== undefined && epoch?.endYear !== undefined) {
    return Math.round((epoch.startYear + epoch.endYear) / 2);
  }
  let h = 0;
  for (const c of trip.guid) h = (h * 31 + c.charCodeAt(0)) & 0x7fffffff;
  return Math.round(-2500 + (h % 5000));
}

export function formatYear(year: number): string {
  const abs = Math.abs(year);
  if (year < 0) return abs >= 1_000_000 ? `${(abs / 1_000_000).toFixed(1)}M BC` : `${abs.toLocaleString()} BC`;
  if (year < 1000) return `${year} AD`;
  return year.toString();
}

/**
 * Customer-facing state of a departure. (Paradoxes and critical classification are internal agency business
 * and deliberately not shown on the Continuum.)
 */
export function tripPhase(trip: Pick<TripDto, 'tripStatus'>): Phase {
  switch (trip.tripStatus) {
    case 'Scheduled': return 'open';
    case 'Active': return 'underway';
    default: return 'closed';
  }
}

export const PHASE_COLORS = { open: '#3FAE79', underway: '#C9A84C', closed: '#6B7488' } as const;
export const PHASE_LABELS = { open: 'Boarding open', underway: 'Under way', closed: 'Archived' } as const;

export interface TripPin {
  trip: TripDto;
  year: number;
  x: number;
  zone: EraZone;
  stemHeight: number;
  phase: Phase;
  signalBars: number;
}

