export interface DirectorDto {
  guid: string;
  name: string;
  managerCount: number;
}

export interface SystemStatsDto {
  totalTrips: number;
  criticalTripCount: number;
  totalParadoxes: number;
  openParadoxes: number;
  totalManagers: number;
  totalAgents: number;
  totalCustomers: number;
}
