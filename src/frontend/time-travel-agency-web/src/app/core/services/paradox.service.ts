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
