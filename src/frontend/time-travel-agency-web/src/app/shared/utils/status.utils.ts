import { COLORS } from '../constants/design';

export interface StatusMeta {
  label: string;
  color: string;
  bg: string;
}

export function tripStatusMeta(status: string): StatusMeta {
  const map: Record<string, StatusMeta> = {
    Active:    { label: 'Active',    ...COLORS.statusActive },
    Critical:  { label: 'Critical',  ...COLORS.statusCritical },
    Completed: { label: 'Completed', ...COLORS.statusCompleted },
    Cancelled: { label: 'Cancelled', ...COLORS.statusCancelled },
  };
  return map[status] ?? { label: status, color: COLORS.textMuted, bg: 'transparent' };
}

// Backend enum: InQueue=0, InProcess=1, Solved=2
export function paradoxMeta(status: string): StatusMeta {
  const map: Record<string, StatusMeta> = {
    InQueue:   { label: 'In Queue',  ...COLORS.paradoxPending },
    InProcess: { label: 'In Process', color: '#5B8DC9', bg: 'rgba(91,141,201,0.15)' },
    Solved:    { label: 'Solved',    ...COLORS.paradoxResolved },
  };
  return map[status] ?? { label: status, color: COLORS.textMuted, bg: 'transparent' };
}

// Backend enum: GrandFatherParadox=0, BootstrapParadox=1, PredestinationParadox=2, InformationParadox=3
export function paradoxTypeLabel(type: string): string {
  const map: Record<string, string> = {
    GrandFatherParadox:     'Grandfather Paradox',
    BootstrapParadox:       'Bootstrap Paradox',
    PredestinationParadox:  'Predestination Paradox',
    InformationParadox:     'Information Paradox',
  };
  return map[type] ?? type;
}

// Backend tripType discriminator: "Trip" = Standard, "CriticalTrip" = Critical
export function tripTypeLabel(tripType: string): string {
  return tripType === 'CriticalTrip' ? 'Critical' : 'Standard';
}

export function starString(stars: number): string {
  return '★'.repeat(Math.max(0, stars)) + '☆'.repeat(Math.max(0, 5 - stars));
}

export function initials(firstname: string, lastname: string): string {
  return `${firstname[0] ?? ''}${lastname[0] ?? ''}`.toUpperCase();
}

export function agentFullName(agent: { firstname: string; lastname: string }): string {
  return `${agent.firstname} ${agent.lastname}`;
}
