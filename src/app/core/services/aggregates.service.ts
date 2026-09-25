import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AggregateResult } from '../models';

export interface AggregateFilters {
  q?: string | null;
  status?: string | null;
  regionCode?: string | null;
  minTotal?: string | null;
  maxTotal?: string | null;
}

@Injectable({ providedIn: 'root' })
export class AggregatesService {
  private readonly http = inject(HttpClient);

  get(
    from: string,
    to: string,
    topCategories = 5,
    extra?: AggregateFilters,
  ): Observable<AggregateResult> {
    let params = new HttpParams()
      .set('from', from)
      .set('to', to)
      .set('topCategories', String(topCategories));
    if (extra?.q) params = params.set('q', extra.q);
    if (extra?.status) params = params.set('status', extra.status);
    if (extra?.regionCode) params = params.set('regionCode', extra.regionCode);
    if (extra?.minTotal) params = params.set('minTotal', extra.minTotal);
    if (extra?.maxTotal) params = params.set('maxTotal', extra.maxTotal);
    return this.http.get<AggregateResult>('/api/aggregates', { params });
  }
}
