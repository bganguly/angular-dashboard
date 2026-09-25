import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AggregateResult } from '../models';

@Injectable({ providedIn: 'root' })
export class AggregatesService {
  private readonly http = inject(HttpClient);

  get(from: string, to: string, topCategories = 5): Observable<AggregateResult> {
    const params = new HttpParams()
      .set('from', from)
      .set('to', to)
      .set('topCategories', String(topCategories));
    return this.http.get<AggregateResult>('/api/aggregates', { params });
  }
}
