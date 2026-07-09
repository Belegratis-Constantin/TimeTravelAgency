import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CustomerDto } from '../models/trip.model';

@Injectable({ providedIn: 'root' })
export class CustomerService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/Customer';

  getAll(): Observable<CustomerDto[]> {
    return this.http.get<CustomerDto[]>(this.base);
  }

  getById(guid: string): Observable<CustomerDto> {
    return this.http.get<CustomerDto>(`${this.base}/${guid}`);
  }

  getTrips(guid: string): Observable<import('../models/trip.model').TripDto[]> {
    return this.http.get<import('../models/trip.model').TripDto[]>(`${this.base}/${guid}/trips`);
  }

  create(cmd: { firstname: string; lastname: string; email: string; phoneNumber: string; dateOfBirth: string; address: { street: string; city: string; zipCode: number } }): Observable<import('../models/trip.model').CustomerDto> {
    return this.http.post<import('../models/trip.model').CustomerDto>(this.base, cmd);
  }
}
