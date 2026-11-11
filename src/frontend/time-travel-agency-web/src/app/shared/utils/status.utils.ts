import { ParadoxStatus, ParadoxType } from '../../core/models/paradox.model';
import { TripStatus, TripType } from '../../core/models/trip.model';
import { AgentType, EpochDto } from '../../core/models/agent.model';

export type Tone = 'neutral' | 'blue' | 'amber' | 'green' | 'red' | 'rust' | 'gold' | 'violet';

export interface StatusMeta {
  label: string;
  tone: Tone;
}

const TRIP_STATUS: Record<TripStatus, StatusMeta> = {
  Scheduled: { label: 'Scheduled', tone: 'blue' },
  Active: { label: 'Under way', tone: 'gold' },
  Completed: { label: 'Completed', tone: 'neutral' },
  Cancelled: { label: 'Cancelled', tone: 'rust' },
};

const PARADOX_STATUS: Record<ParadoxStatus, StatusMeta> = {
  InQueue: { label: 'In Queue', tone: 'amber' },
  InProcess: { label: 'In Process', tone: 'blue' },
  Solved: { label: 'Solved', tone: 'green' },
  Escalated: { label: 'Escalated', tone: 'red' },
};

const PARADOX_TYPE: Record<ParadoxType, { label: string; color: string }> = {
  GrandFatherParadox: { label: 'Grandfather Paradox', color: '#E05A4E' },
  BootstrapParadox: { label: 'Bootstrap Paradox', color: '#C9A84C' },
  PredestinationParadox: { label: 'Predestination Paradox', color: '#7B5EA7' },
  InformationParadox: { label: 'Information Paradox', color: '#3B9EBF' },
};

export const PARADOX_TYPES = Object.keys(PARADOX_TYPE) as ParadoxType[];

export function tripStatusMeta(status: string): StatusMeta {
  return TRIP_STATUS[status as TripStatus] ?? { label: status, tone: 'neutral' };
}

export function paradoxMeta(status: string): StatusMeta {
  return PARADOX_STATUS[status as ParadoxStatus] ?? { label: status, tone: 'neutral' };
}

export function paradoxTypeLabel(type: string): string {
  return PARADOX_TYPE[type as ParadoxType]?.label ?? type;
}

export function paradoxTypeColor(type: string): string {
  return PARADOX_TYPE[type as ParadoxType]?.color ?? '#6B7488';
}

/** Solved paradoxes are closed; every other status still threatens the timeline. */
export function isOpenParadox(p: { paradoxStatus: string }): boolean {
  return p.paradoxStatus !== 'Solved';
}

/** Open paradoxes on a running trip at which it is reclassified as critical (mirrors ParadoxService). */
export const CRITICAL_PARADOX_THRESHOLD = 3;

export function tripTypeLabel(tripType: TripType | string): string {
  return tripType === 'CriticalTrip' ? 'Critical' : 'Standard';
}

export function tripTypeMeta(tripType: TripType | string): StatusMeta {
  return tripType === 'CriticalTrip' ? { label: 'Critical', tone: 'red' } : { label: 'Standard', tone: 'neutral' };
}

export function tripDisplayName(trip: { tripName: string | null }): string {
  return trip.tripName ?? 'Uncatalogued Destination';
}

export function agentTypeLabel(type: AgentType | string): string {
  return type === 'LicensedAgent' ? 'Licensed Agent' : 'Support Agent';
}

export function starString(stars: number): string {
  const s = Math.max(0, Math.min(5, Math.round(stars)));
  return '★'.repeat(s) + '☆'.repeat(5 - s);
}

export function initials(person: { firstname: string; lastname: string }): string {
  return `${person.firstname[0] ?? ''}${person.lastname[0] ?? ''}`.toUpperCase();
}

export function fullName(person: { firstname: string; lastname: string }): string {
  return `${person.firstname} ${person.lastname}`;
}

export function formatYear(year: number): string {
  const abs = Math.abs(year);
  if (year < 0) return abs >= 1_000_000 ? `${(abs / 1_000_000).toFixed(1)}M BCE` : `${abs.toLocaleString('en-US')} BCE`;
  return `${year} CE`;
}

export function epochLabel(epoch: EpochDto | null | undefined, withRange = true): string | null {
  if (!epoch) return null;
  return withRange ? `${epoch.name} (${formatYear(epoch.startYear)} – ${formatYear(epoch.endYear)})` : epoch.name;
}
