import { AddressDto, TripDto } from './trip.model';

export type AgentType = 'Agent' | 'LicensedAgent';

export interface EpochDto {
  id: number;
  name: string;
  startYear: number;
  endYear: number;
}

export interface AgentDto {
  id: number;
  guid: string;
  firstname: string;
  lastname: string;
  dateOfBirth: string;
  specialisationTime: number;
  agentType: AgentType;
  managerId: number | null;
  specialisationEpochId: EpochDto | null;
  trips: TripDto[];
}

export interface CreateAgentCmd {
  firstname: string;
  lastname: string;
  dateOfBirth: string;
  specialisationTime: number;
  managerId: number | null;
  address: AddressDto;
}

export interface UpgradeAgentCmd {
  licenseNumber: number;
  licenseExpirationDate: string;
}
