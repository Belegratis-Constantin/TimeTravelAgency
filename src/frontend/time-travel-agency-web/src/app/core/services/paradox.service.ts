import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ParadoxService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/Paradox';

  addToTrip(tripGuid: string): Observable<{ paradox: any; tripBecameCritical: boolean }> {
    return this.http.post<{ paradox: any; tripBecameCritical: boolean }>(`${this.base}/trip/${tripGuid}`, null);
  }

  changeStatus(paradoxGuid: string, status: string, managerGuid?: string): Observable<string> {
    const url = managerGuid
      ? `${this.base}/${paradoxGuid}/status?managerGuid=${managerGuid}`
      : `${this.base}/${paradoxGuid}/status`;
    return this.http.patch(url, { status }, { responseType: 'text' });
  }
}
