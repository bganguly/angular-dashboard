import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { OrdersService } from './orders.service';
import { OrderListResult } from '../models';

const mockResult: OrderListResult = {
  data: [],
  page: 1,
  pageSize: 20,
  total: 0,
  totalPages: 0,
  approximate: false,
};

describe('OrdersService', () => {
  let service: OrdersService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(OrdersService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('calls /api/orders with no params by default', () => {
    service.list().subscribe();
    const req = http.expectOne((r) => r.url === '/api/orders');
    expect(req.request.method).toBe('GET');
    req.flush(mockResult);
  });

  it('appends q param when provided', () => {
    service.list({ q: 'alice' }).subscribe();
    const req = http.expectOne((r) => r.urlWithParams.includes('q=alice'));
    req.flush(mockResult);
  });

  it('appends status param when provided', () => {
    service.list({ status: 'PENDING' }).subscribe();
    const req = http.expectOne((r) => r.urlWithParams.includes('status=PENDING'));
    req.flush(mockResult);
  });

  it('appends sort and dir params', () => {
    service.list({ sort: 'total', dir: 'asc' }).subscribe();
    const req = http.expectOne(
      (r) => r.urlWithParams.includes('sort=total') && r.urlWithParams.includes('dir=asc')
    );
    req.flush(mockResult);
  });
});
