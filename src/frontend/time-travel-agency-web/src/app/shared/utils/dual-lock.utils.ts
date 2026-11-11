import { ParadoxFeedDto } from '../../core/models/paradox.model';
import { isOpenParadox } from './status.utils';

export type LockRole = 'licensed' | 'support';

type LockFields = Pick<ParadoxFeedDto,
  'paradoxStatus' | 'licensedAgentId' | 'agentId' | 'dualLockRequired' | 'licensedLocked' | 'supportLocked' | 'tripHasSupportAgent'>;

/** The agent's part in a dual lock (mirrors ParadoxService.DualLockRoleOf). */
export function lockRoleOf(p: LockFields, agentId: number | null | undefined): LockRole | null {
  if (agentId === null || agentId === undefined) return null;
  if (p.licensedAgentId === agentId) return 'licensed';
  if (p.agentId === agentId) return 'support';
  return null;
}

export type StabiliseBlock = 'none' | 'closed' | 'needsSupport' | 'notPartner' | 'waitingForPartner';

/** Why an agent cannot (yet) start a stabilisation round — 'none' means they can. */
export function stabiliseBlock(p: LockFields, agentId: number | null | undefined): StabiliseBlock {
  if (!isOpenParadox(p)) return 'closed';
  if (!p.dualLockRequired) return 'none';
  if (!p.tripHasSupportAgent) return 'needsSupport';
  const role = lockRoleOf(p, agentId);
  if (!role) return 'notPartner';
  const mine = role === 'licensed' ? p.licensedLocked : p.supportLocked;
  return mine ? 'waitingForPartner' : 'none';
}

export function canStabilise(p: LockFields, agentId: number | null | undefined): boolean {
  return stabiliseBlock(p, agentId) === 'none';
}

export const BLOCK_TEXT: Record<Exclude<StabiliseBlock, 'none' | 'closed'>, string> = {
  needsSupport: 'Needs a support agent',
  notPartner: 'Dual lock: licensed + support agent',
  waitingForPartner: 'Your lock holds — waiting for your partner',
};
