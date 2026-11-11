import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  ParadoxFeedDto,
  ParadoxSimulationDto,
  ParadoxStatus,
  SpawnParadoxResultDto,
  UpdateSimulationCmd,
} from '../models/paradox.model';

@Injectable({ providedIn: 'root' })
export class ParadoxService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/Paradox';
  private readonly simulationBase = '/api/Simulation';

  getAll(): Observable<ParadoxFeedDto[]> {
    return this.http.get<ParadoxFeedDto[]>(this.base);
  }

  addToTrip(tripGuid: string): Observable<SpawnParadoxResultDto> {
    return this.http.post<SpawnParadoxResultDto>(`${this.base}/trip/${tripGuid}`, null);
  }

  changeStatus(paradoxGuid: string, status: ParadoxStatus, managerGuid?: string): Observable<string> {
    const params = managerGuid ? new HttpParams().set('managerGuid', managerGuid) : undefined;
    return this.http.patch(`${this.base}/${paradoxGuid}/status`, { status }, { params, responseType: 'text' });
  }

  /** The trip's manager reorders its paradox queue (position 0 = worked on now). */
  moveInQueue(paradoxGuid: string, position: number, managerGuid?: string): Observable<ParadoxFeedDto> {
    const params = managerGuid ? new HttpParams().set('managerGuid', managerGuid) : undefined;
    return this.http.patch<ParadoxFeedDto>(`${this.base}/${paradoxGuid}/queue`, { position }, { params });
  }

  /** Field stabilisation by an agent on the paradox's trip. */
  engage(paradoxGuid: string, agentGuid: string): Observable<ParadoxFeedDto> {
    return this.http.post<ParadoxFeedDto>(`${this.base}/${paradoxGuid}/engage/${agentGuid}`, null);
  }

  resolve(paradoxGuid: string, agentGuid: string): Observable<ParadoxFeedDto> {
    return this.http.post<ParadoxFeedDto>(`${this.base}/${paradoxGuid}/resolve/${agentGuid}`, null);
  }

  fail(paradoxGuid: string, agentGuid: string): Observable<ParadoxFeedDto> {
    return this.http.post<ParadoxFeedDto>(`${this.base}/${paradoxGuid}/fail/${agentGuid}`, null);
  }

  getSimulation(): Observable<ParadoxSimulationDto> {
    return this.http.get<ParadoxSimulationDto>(this.simulationBase);
  }

  updateSimulation(cmd: UpdateSimulationCmd): Observable<ParadoxSimulationDto> {
    return this.http.put<ParadoxSimulationDto>(this.simulationBase, cmd);
  }

  spawnRandom(): Observable<SpawnParadoxResultDto> {
    return this.http.post<SpawnParadoxResultDto>(`${this.simulationBase}/spawn`, null);
  }
}
