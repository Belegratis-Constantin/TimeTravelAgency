import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { DirectorDto, SystemStatsDto } from '../models/director.model';
import { ManagerWithIdDto } from '../models/manager.model';
import { AgentDto } from '../models/agent.model';

@Injectable({ providedIn: 'root' })
export class DirectorService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/Director';

  get(): Observable<DirectorDto> {
    return this.http.get<DirectorDto>(this.base);
  }

  getManagers(guid: string): Observable<ManagerWithIdDto[]> {
    return this.http.get<ManagerWithIdDto[]>(`${this.base}/${guid}/managers`);
  }

  getAgents(guid: string): Observable<AgentDto[]> {
    return this.http.get<AgentDto[]>(`${this.base}/${guid}/agents`);
  }

  getStats(guid: string): Observable<SystemStatsDto> {
    return this.http.get<SystemStatsDto>(`${this.base}/${guid}/stats`);
  }

  reassignManager(directorGuid: string, managerGuid: string): Observable<string> {
    return this.http.patch(`${this.base}/${directorGuid}/managers/${managerGuid}`, null, { responseType: 'text' });
  }
}
