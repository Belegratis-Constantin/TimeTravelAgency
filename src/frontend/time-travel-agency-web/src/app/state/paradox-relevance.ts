import { ParadoxFeedDto } from '../core/models/paradox.model';
import { Role } from './app-state.service';

export interface RelevanceContext {
  role: Role;
  agentId: number | null;
  managerGuid: string | null;
}

/** Whether a paradox concerns the signed-in identity (drives notifications and the header counter). */
export function isParadoxRelevant(p: ParadoxFeedDto, ctx: RelevanceContext): boolean {
  switch (ctx.role) {
    // Paradoxes are internal agency business — customers are never told about them.
    case 'customer': return false;
    case 'agent': return ctx.agentId !== null && (p.licensedAgentId === ctx.agentId || p.agentId === ctx.agentId);
    case 'manager': return ctx.managerGuid !== null && p.managerGuid === ctx.managerGuid;
    case 'director':
    case 'time':
      return true;
  }
}

/** Paradoxes in `next` that were not present in the previously known set. */
export function findArrivals(known: ReadonlySet<string> | null, next: readonly ParadoxFeedDto[]): ParadoxFeedDto[] {
  if (known === null) return [];
  return next.filter(p => !known.has(p.guid));
}
