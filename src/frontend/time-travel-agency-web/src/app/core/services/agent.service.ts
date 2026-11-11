import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AgentDto, CreateAgentCmd } from '../models/agent.model';

@Injectable({ providedIn: 'root' })
export class AgentService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/Agent';

  getAll(): Observable<AgentDto[]> {
    return this.http.get<AgentDto[]>(this.base);
  }

  create(cmd: CreateAgentCmd): Observable<AgentDto> {
    return this.http.post<AgentDto>(this.base, { ...cmd, agentType: 'Agent' });
  }
}
