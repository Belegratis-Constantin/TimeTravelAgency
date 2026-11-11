export type ParadoxStatus = 'InQueue' | 'InProcess' | 'Solved' | 'Escalated';
export type ParadoxType = 'GrandFatherParadox' | 'BootstrapParadox' | 'PredestinationParadox' | 'InformationParadox';

export const PARADOX_STATUSES: readonly ParadoxStatus[] = ['InQueue', 'InProcess', 'Solved', 'Escalated'];

/** Paradox as embedded in a TripDto. */
export interface ParadoxDto {
  guid: string;
  paradoxStatus: ParadoxStatus;
  paradoxType: ParadoxType;
}

/** Paradox with trip context, served by GET /api/Paradox (newest first). */
export interface ParadoxFeedDto extends ParadoxDto {
  description: string;
  createdAt: string;
  tripGuid: string;
  tripName: string | null;
  tripType: string;
  managerGuid: string;
  licensedAgentId: number;
  agentId: number | null;
}

export interface SpawnParadoxResultDto {
  paradox: ParadoxFeedDto;
  tripBecameCritical: boolean;
}

export interface ParadoxSimulationDto {
  enabled: boolean;
  intervalSeconds: number;
  nextSpawnAt: string | null;
  lastSpawnAt: string | null;
  totalSpawned: number;
}

export interface UpdateSimulationCmd {
  enabled?: boolean;
  intervalSeconds?: number;
}
