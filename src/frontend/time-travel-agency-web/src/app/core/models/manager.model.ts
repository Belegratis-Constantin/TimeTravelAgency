import { AddressDto } from './trip.model';

export interface ManagerDto {
  guid: string;
  firstname: string;
  lastname: string;
  email: string;
  phoneNumber: string;
  address: AddressDto;
}

export interface ManagerWithIdDto extends ManagerDto {
  id: number;
}

export interface CreateTripByManagerCmd {
  dateInRealLife: string;
  tripName: string | null;
  licensedAgentGuid: string;
}
