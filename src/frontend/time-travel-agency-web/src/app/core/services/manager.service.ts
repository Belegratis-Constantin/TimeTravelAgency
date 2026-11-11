import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CreateManagerCmd, CreateTripByManagerCmd, ManagerDto, ManagerWithIdDto } from '../models/manager.model';
import { AgentDto, UpgradeAgentCmd } from '../models/agent.model';

@Injectable({ providedIn: 'root' })
export class ManagerService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/Manager';

  getAllWithId(): Observable<ManagerWithIdDto[]> {
    return this.http.get<ManagerWithIdDto[]>(`${this.base}/with-id`);
  }

  create(cmd: CreateManagerCmd): Observable<ManagerDto> {
    return this.http.post<ManagerDto>(this.base, cmd);
  }

  createTrip(managerGuid: string, cmd: CreateTripByManagerCmd): Observable<string> {
    return this.http.post(`${this.base}/create-trip/${managerGuid}`, cmd, { responseType: 'text' });
  }

  makeAgentLicensed(managerGuid: string, agentGuid: string, cmd: UpgradeAgentCmd): Observable<AgentDto> {
    return this.http.patch<AgentDto>(`${this.base}/make-agent-licensed/${managerGuid}/${agentGuid}`, cmd);
  }

  assignAgent(managerGuid: string, agentGuid: string, tripGuid: string): Observable<string> {
    return this.http.patch(`${this.base}/assign-agent-to-trip/${managerGuid}/${agentGuid}/${tripGuid}`, null, {
      responseType: 'text',
    });
  }
}
