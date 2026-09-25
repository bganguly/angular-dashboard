import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { OrdersService } from '../../core/services/orders.service';
import { RegionsService } from '../../core/services/regions.service';
import { DataTableComponent, TableColumn } from '../../shared/components/data-table/data-table.component';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';
import { OrderDTO, RegionSummary, OrderStatus } from '../../core/models';

const ORDER_STATUSES: OrderStatus[] = ['PENDING','CONFIRMED','PROCESSING','SHIPPED','DELIVERED','CANCELLED','REFUNDED'];

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DataTableComponent, PaginationComponent, StatusBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main id="main-content" class="container-fluid py-4" aria-label="Orders list">
      <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-3">
        <h1 class="h4 mb-0 fw-semibold">Orders</h1>
        <span class="text-muted small" aria-live="polite">
          {{ total() | number }} {{ approximate() ? '(approx.)' : '' }} results
        </span>
      </div>

      <form [formGroup]="filterForm" class="row g-2 mb-3" aria-label="Filter orders" role="search">
        <div class="col-12 col-md-4">
          <label for="ordersSearch" class="visually-hidden">Search orders</label>
          <input id="ordersSearch" type="search" class="form-control form-control-sm"
                 placeholder="Search name, email, notes…" formControlName="q"
                 aria-label="Search orders" />
        </div>
        <div class="col-6 col-md-2">
          <label for="statusFilter" class="visually-hidden">Filter by status</label>
          <select id="statusFilter" class="form-select form-select-sm" formControlName="status" aria-label="Filter by status">
            <option value="">All statuses</option>
            <option *ngFor="let s of statuses" [value]="s">{{ s }}</option>
          </select>
        </div>
        <div class="col-6 col-md-2">
          <label for="regionFilter" class="visually-hidden">Filter by region</label>
          <select id="regionFilter" class="form-select form-select-sm" formControlName="regionCode" aria-label="Filter by region">
            <option value="">All regions</option>
            <option *ngFor="let r of regions()" [value]="r.code">{{ r.name }}</option>
          </select>
        </div>
        <div class="col-6 col-md-2">
          <label for="dateFrom" class="visually-hidden">From date</label>
          <input id="dateFrom" type="date" class="form-control form-control-sm" formControlName="from" aria-label="From date" />
        </div>
        <div class="col-6 col-md-2">
          <label for="dateTo" class="visually-hidden">To date</label>
          <input id="dateTo" type="date" class="form-control form-control-sm" formControlName="to" aria-label="To date" />
        </div>
      </form>

      <app-data-table
        [columns]="columns"
        [rows]="orders()"
        [loading]="loading()"
        [sortKey]="sortKey()"
        [sortDir]="sortDir()"
        caption="Orders table"
        (sortChange)="onSort($event)">
        <tr *ngFor="let order of orders()" tabindex="0">
          <td>{{ order.id }}</td>
          <td>{{ order.customer.firstName }} {{ order.customer.lastName }}</td>
          <td><app-status-badge [status]="order.status" /></td>
          <td class="text-end">{{ order.total | currency }}</td>
          <td>{{ order.region.name }}</td>
          <td>{{ order.placedAt | date:'mediumDate' }}</td>
        </tr>
      </app-data-table>

      <div class="d-flex justify-content-between align-items-center mt-3 flex-wrap gap-2">
        <div>
          <label for="pageSize" class="visually-hidden">Rows per page</label>
          <select id="pageSize" class="form-select form-select-sm w-auto"
                  [value]="pageSize()" (change)="onPageSize($event)" aria-label="Rows per page">
            <option value="10">10 / page</option>
            <option value="20">20 / page</option>
            <option value="50">50 / page</option>
          </select>
        </div>
        <app-pagination [page]="page()" [totalPages]="totalPages()" (pageChange)="onPage($event)" />
      </div>
    </main>
  `,
})
export class OrdersComponent implements OnInit {
  private readonly ordersSvc = inject(OrdersService);
  private readonly regionsSvc = inject(RegionsService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  readonly statuses = ORDER_STATUSES;
  readonly orders = signal<OrderDTO[]>([]);
  readonly regions = signal<RegionSummary[]>([]);
  readonly loading = signal(false);
  readonly total = signal(0);
  readonly totalPages = signal(0);
  readonly approximate = signal(false);
  readonly page = signal(1);
  readonly pageSize = signal(20);
  readonly sortKey = signal('placedAt');
  readonly sortDir = signal<'asc' | 'desc'>('desc');

  readonly filterForm = this.fb.group({
    q: [''],
    status: [''],
    regionCode: [''],
    from: [''],
    to: [''],
  });

  readonly columns: TableColumn<OrderDTO>[] = [
    { key: 'id',        label: 'ID',       sortable: false },
    { key: 'customer',  label: 'Customer',  sortable: true },
    { key: 'status',    label: 'Status',    sortable: true },
    { key: 'total',     label: 'Total',     sortable: true, class: 'text-end' },
    { key: 'region',    label: 'Region',    sortable: false },
    { key: 'placedAt',  label: 'Date',      sortable: true },
  ];

  ngOnInit(): void {
    this.regionsSvc.list().subscribe((r) => this.regions.set(r));

    this.filterForm.valueChanges.pipe(debounceTime(300), distinctUntilChanged()).subscribe(() => {
      this.page.set(1);
      this.fetch();
    });

    this.fetch();
  }

  fetch(): void {
    const { q, status, regionCode, from, to } = this.filterForm.value;
    this.loading.set(true);
    this.ordersSvc.list({
      q, status, regionCode, from, to,
      page: this.page(),
      pageSize: this.pageSize(),
      sort: this.sortKey(),
      dir: this.sortDir(),
    }).subscribe({
      next: (res) => {
        this.orders.set(res.data);
        this.total.set(res.total);
        this.totalPages.set(res.totalPages);
        this.approximate.set(res.approximate);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  onSort(e: { key: string; dir: 'asc' | 'desc' }): void {
    this.sortKey.set(e.key);
    this.sortDir.set(e.dir);
    this.page.set(1);
    this.fetch();
  }

  onPage(p: number): void {
    this.page.set(p);
    this.fetch();
  }

  onPageSize(e: Event): void {
    this.pageSize.set(Number((e.target as HTMLSelectElement).value));
    this.page.set(1);
    this.fetch();
  }
}
