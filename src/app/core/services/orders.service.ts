import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { OrderListResult, OrderFilters } from '../models';

@Injectable({ providedIn: 'root' })
export class OrdersService {
  private readonly http = inject(HttpClient);

  list(filters: OrderFilters = {}): Observable<OrderListResult> {
    let params = new HttpParams();
    if (filters.q) params = params.set('q', filters.q);
    if (filters.status) params = params.set('status', filters.status);
    if (filters.regionCode) params = params.set('regionCode', filters.regionCode);
    if (filters.from) params = params.set('from', filters.from);
    if (filters.to) params = params.set('to', filters.to);
    if (filters.minTotal != null) params = params.set('minTotal', String(filters.minTotal));
    if (filters.maxTotal != null) params = params.set('maxTotal', String(filters.maxTotal));
    if (filters.page) params = params.set('page', String(filters.page));
    if (filters.pageSize) params = params.set('pageSize', String(filters.pageSize));
    if (filters.sort) params = params.set('sort', filters.sort);
    if (filters.dir) params = params.set('dir', filters.dir);
    return this.http.get<OrderListResult>('/api/orders', { params });
  }
}
