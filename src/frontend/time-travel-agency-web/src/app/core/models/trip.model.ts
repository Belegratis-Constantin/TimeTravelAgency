import { ParadoxDto } from './paradox.model';

export type { ParadoxDto } from './paradox.model';

export interface AddressDto {
  street: string;
  city: string;
  zipCode: number;
}

export interface ReviewDto {
  guid: string;
  stars: number;
  header: string;
  content: string | null;
}

export interface ReportDto {
  guid: string;
  header: string;
  date: string;
  content: string | null;
}

export interface CustomerDto {
  guid: string;
  firstname: string;
  lastname: string;
  email: string;
  phoneNumber: string;
  dateOfBirth: string;
  address: AddressDto;
  reviews: ReviewDto[];
}

/** TPH discriminator values sent by the backend. */
export type TripType = 'Trip' | 'CriticalTrip';
export type TripStatus = 'Active' | 'Completed' | 'Cancelled';

export interface TripDto {
  guid: string;
  dateInRealLife: string;
  tripName: string | null;
  tripType: TripType;
  tripStatus: TripStatus;
  licensedAgentId: number;
  managerId: number;
  paradoxes: ParadoxDto[];
  customers: CustomerDto[];
  reports: ReportDto[];
  reviews: ReviewDto[];
  agentId: number | null;
  managerGuid: string | null;
}

export interface CreateCustomerCmd {
  firstname: string;
  lastname: string;
  email: string;
  phoneNumber: string;
  dateOfBirth: string;
  address: AddressDto;
}

export interface CreateReportCmd {
  header: string;
  content: string | null;
}
