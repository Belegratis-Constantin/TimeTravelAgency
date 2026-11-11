import { ParadoxFeedDto } from '../../core/models/paradox.model';
import { canStabilise, lockRoleOf, stabiliseBlock } from './dual-lock.utils';

const p = (o: Partial<ParadoxFeedDto> = {}) => ({
  paradoxStatus: 'Escalated', licensedAgentId: 1, agentId: 2, dualLockRequired: true,
  licensedLocked: false, supportLocked: false, tripHasSupportAgent: true, ...o,
}) as ParadoxFeedDto;

describe('dual lock', () => {
  it('lets anyone on the trip stabilise a normal paradox', () => {
    expect(canStabilise(p({ dualLockRequired: false, paradoxStatus: 'InQueue' }), 1)).toBe(true);
    expect(stabiliseBlock(p({ paradoxStatus: 'Solved' }), 1)).toBe('closed');
  });

  it('assigns the roles of a dual lock', () => {
    expect(lockRoleOf(p(), 1)).toBe('licensed');
    expect(lockRoleOf(p(), 2)).toBe('support');
    expect(lockRoleOf(p(), 9)).toBeNull();
  });

  it('blocks without support agent, for outsiders and while waiting for the partner', () => {
    expect(stabiliseBlock(p({ tripHasSupportAgent: false, agentId: null }), 1)).toBe('needsSupport');
    expect(stabiliseBlock(p(), 9)).toBe('notPartner');
    expect(stabiliseBlock(p({ licensedLocked: true, paradoxStatus: 'InProcess' }), 1)).toBe('waitingForPartner');
    expect(canStabilise(p({ licensedLocked: true, paradoxStatus: 'InProcess' }), 2)).toBe(true);
  });
});
