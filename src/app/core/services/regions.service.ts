import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, shareReplay } from 'rxjs';
import { RegionSummary } from '../models';

@Injectable({ providedIn: 'root' })
export class RegionsService {
  private readonly http = inject(HttpClient);
  private readonly cache$ = this.http.get<RegionSummary[]>('/api/regions').pipe(shareReplay(1));

  list(): Observable<RegionSummary[]> {
    return this.cache$;
  }
}
