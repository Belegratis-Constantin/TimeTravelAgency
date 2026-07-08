import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { TripDto } from '../models/trip.model';

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

  getUpcoming(sorted = true): Observable<TripDto[]> {
    return this.http.get<TripDto[]>(`${this.base}/upcoming?sorted=${sorted}`);
  }

  bookTrip(tripGuid: string, customerGuid: string): Observable<string> {
    return this.http.post(`${this.base}/${tripGuid}/book/${customerGuid}`, null, {
      responseType: 'text',
    });
  }

  fileReport(tripGuid: string, agentGuid: string, cmd: { header: string; content: string | null }): Observable<unknown> {
    return this.http.post(`${this.base}/${tripGuid}/report/${agentGuid}`, cmd);
  }
}
