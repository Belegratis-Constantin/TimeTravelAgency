import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { DirectorDto } from '../models/director.model';

@Injectable({ providedIn: 'root' })
export class DirectorService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/Director';

  get(): Observable<DirectorDto> {
    return this.http.get<DirectorDto>(this.base);
  }

  /** Places a manager under this director's command. */
  assignManager(directorGuid: string, managerGuid: string): Observable<string> {
    return this.http.patch(`${this.base}/${directorGuid}/managers/${managerGuid}`, null, { responseType: 'text' });
  }
}
