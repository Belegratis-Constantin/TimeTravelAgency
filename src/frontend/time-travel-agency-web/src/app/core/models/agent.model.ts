import { TripDto } from './trip.model';

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
  agentType: string;
  managerId: number | null;
  specialisationEpochId: EpochDto | null;
  trips: TripDto[];
}
