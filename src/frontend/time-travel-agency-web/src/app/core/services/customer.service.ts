import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CreateCustomerCmd, CustomerDto } from '../models/trip.model';

@Injectable({ providedIn: 'root' })
export class CustomerService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/Customer';

  getAll(): Observable<CustomerDto[]> {
    return this.http.get<CustomerDto[]>(this.base);
  }

  create(cmd: CreateCustomerCmd): Observable<CustomerDto> {
    return this.http.post<CustomerDto>(this.base, cmd);
  }
}
