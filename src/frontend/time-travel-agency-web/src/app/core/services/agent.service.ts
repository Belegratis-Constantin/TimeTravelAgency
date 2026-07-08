import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AgentDto } from '../models/agent.model';

@Injectable({ providedIn: 'root' })
export class AgentService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/Agent';

  getAll(): Observable<AgentDto[]> {
    return this.http.get<AgentDto[]>(this.base);
  }

  getById(guid: string): Observable<AgentDto> {
    return this.http.get<AgentDto>(`${this.base}/${guid}`);
  }

  delete(guid: string): Observable<string> {
    return this.http.delete(`${this.base}/${guid}`, { responseType: 'text' });
  }
}
