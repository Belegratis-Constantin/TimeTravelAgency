import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ManagerDto, ManagerWithIdDto, CreateTripByManagerCmd } from '../models/manager.model';
import { AgentDto } from '../models/agent.model';

@Injectable({ providedIn: 'root' })
export class ManagerService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/Manager';

  getAll(): Observable<ManagerDto[]> {
    return this.http.get<ManagerDto[]>(this.base);
  }

  getAllWithId(): Observable<ManagerWithIdDto[]> {
    return this.http.get<ManagerWithIdDto[]>(`${this.base}/with-id`);
  }

  getById(guid: string): Observable<ManagerDto> {
    return this.http.get<ManagerDto>(`${this.base}/${guid}`);
  }

  createTrip(managerGuid: string, cmd: CreateTripByManagerCmd): Observable<string> {
    return this.http.post(`${this.base}/create-trip/${managerGuid}`, cmd, {
      responseType: 'text',
    });
  }

  getAgentsForManager(managerGuid: string): Observable<AgentDto[]> {
    return this.http.get<AgentDto[]>(`${this.base}/get-agents-assigned-to-manager/${managerGuid}`);
  }

  assignAgent(managerGuid: string, agentGuid: string, tripGuid: string): Observable<string> {
    return this.http.patch(
      `${this.base}/assign-agent-to-trip/${managerGuid}/${agentGuid}/${tripGuid}`,
      null,
      { responseType: 'text' }
    );
  }
}
