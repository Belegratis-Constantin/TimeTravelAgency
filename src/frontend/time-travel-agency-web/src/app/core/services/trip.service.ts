import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CreateReportCmd, ReportDto, TripDto } from '../models/trip.model';

@Injectable({ providedIn: 'root' })
export class TripService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/Trip';

  getAll(): Observable<TripDto[]> {
    return this.http.get<TripDto[]>(this.base);
  }

  getById(guid: string): Observable<TripDto> {
    return this.http.get<TripDto>(`${this.base}/${guid}`);
  }

  bookTrip(tripGuid: string, customerGuid: string): Observable<string> {
    return this.http.post(`${this.base}/${tripGuid}/book/${customerGuid}`, null, { responseType: 'text' });
  }

  cancelBooking(tripGuid: string, customerGuid: string): Observable<string> {
    return this.http.delete(`${this.base}/${tripGuid}/book/${customerGuid}`, { responseType: 'text' });
  }

  fileReport(tripGuid: string, agentGuid: string, cmd: CreateReportCmd): Observable<ReportDto> {
    return this.http.post<ReportDto>(`${this.base}/${tripGuid}/report/${agentGuid}`, cmd);
  }
}
