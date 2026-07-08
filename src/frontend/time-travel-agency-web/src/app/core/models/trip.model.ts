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

export interface ParadoxDto {
  guid: string;
  paradoxStatus: string;
  paradoxType: string;
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

export interface TripDto {
  guid: string;
  dateInRealLife: string;
  tripName: string | null;
  tripType: string;
  tripStatus: string;
  licensedAgentId: number;
  managerId: number;
  paradoxes: ParadoxDto[];
  customers: CustomerDto[];
  reports: ReportDto[];
  reviews: ReviewDto[];
  agentId: number | null;
  managerGuid: string | null;
}
