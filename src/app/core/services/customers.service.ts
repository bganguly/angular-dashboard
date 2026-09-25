import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CustomerListResult } from '../models';

@Injectable({ providedIn: 'root' })
export class CustomersService {
  private readonly http = inject(HttpClient);

  list(opts: { cursor?: number | null; limit?: number; q?: string | null; regionId?: number | null } = {}): Observable<CustomerListResult> {
    let params = new HttpParams();
    if (opts.cursor != null) params = params.set('cursor', String(opts.cursor));
    if (opts.limit) params = params.set('limit', String(opts.limit));
    if (opts.q) params = params.set('q', opts.q);
    if (opts.regionId != null) params = params.set('regionId', String(opts.regionId));
    return this.http.get<CustomerListResult>('/api/customers', { params });
  }
}
