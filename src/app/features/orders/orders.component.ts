import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { distinctUntilChanged } from 'rxjs/operators';
import { OrdersService, RegionsService, OrderDTO, RegionSummary, OrderStatus } from '@angular-dashboard/data-access';
import { DataTableComponent, TableColumn, PaginationComponent, StatusBadgeComponent } from '@angular-dashboard/ui';

const ORDER_STATUSES: OrderStatus[] = ['PENDING','CONFIRMED','PROCESSING','SHIPPED','DELIVERED','CANCELLED','REFUNDED'];

const SELECT_CLS = 'rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100';

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DataTableComponent, PaginationComponent, StatusBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main id="main-content" class="w-full px-5 py-8" aria-label="Orders list">
      <header class="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 class="text-2xl font-semibold tracking-tight text-gray-900 dark:text-gray-50">Orders</h1>
          <p class="text-sm text-gray-500 dark:text-gray-400" aria-live="polite">
            {{ total() | number }}{{ approximate() ? ' (approx.)' : '' }} results
          </p>
        </div>
      </header>

      <form [formGroup]="filterForm" aria-label="Filter orders" role="search">
        <div class="relative mb-3">
          <svg aria-hidden="true" viewBox="0 0 20 20" fill="none"
               class="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400">
            <circle cx="9" cy="9" r="6" stroke="currentColor" stroke-width="1.5"/>
            <path d="M14 14L18 18" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
          <label for="ordersSearch" class="sr-only">Search orders</label>
          <input id="ordersSearch" type="search" formControlName="q"
                 placeholder="Search name, email, notes… (press Enter)"
                 class="w-full rounded-full border border-gray-300 bg-white py-3 pl-11 pr-4 text-base text-gray-900 shadow-sm outline-none placeholder:text-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
                 aria-label="Search orders"
                 (keydown.enter)="commitSearch()"
                 (input)="onSearchInput($event)" />
        </div>

        <div class="flex flex-wrap gap-2 mb-4">
          <label class="sr-only" for="statusFilter">Filter by status</label>
          <select id="statusFilter" [class]="selectCls" formControlName="status" aria-label="Filter by status">
            <option value="">All statuses</option>
            <option *ngFor="let s of statuses" [value]="s">{{ s }}</option>
          </select>

          <label class="sr-only" for="regionFilter">Filter by region</label>
          <select id="regionFilter" [class]="selectCls" formControlName="regionCode" aria-label="Filter by region">
            <option value="">All regions</option>
            <option *ngFor="let r of regions()" [value]="r.code">{{ r.name }}</option>
          </select>

          <label class="sr-only" for="dateFrom">From date</label>
          <input id="dateFrom" type="date" [class]="selectCls" formControlName="from" aria-label="From date" />

          <label class="sr-only" for="dateTo">To date</label>
          <input id="dateTo" type="date" [class]="selectCls" formControlName="to" aria-label="To date" />
        </div>
      </form>

      <section class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900 mb-4"
               aria-label="Orders table">
        <app-data-table
          [columns]="columns"
          [rows]="orders()"
          [loading]="loading()"
          [sortKey]="sortKey()"
          [sortDir]="sortDir()"
          caption="Orders table"
          (sortChange)="onSort($event)">
          <tr *ngFor="let order of orders()"
              class="border-b border-gray-100 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800/50 transition-colors"
              tabindex="0">
            <td class="px-3 py-2 align-top text-gray-900 dark:text-gray-100">{{ order.id }}</td>
            <td class="px-3 py-2 align-top text-gray-900 dark:text-gray-100">{{ order.customer.firstName }} {{ order.customer.lastName }}</td>
            <td class="px-3 py-2 align-top"><app-status-badge [status]="order.status" /></td>
            <td class="px-3 py-2 align-top text-right tabular-nums text-gray-900 dark:text-gray-100">{{ order.total | currency }}</td>
            <td class="px-3 py-2 align-top text-gray-700 dark:text-gray-300">{{ order.region.name }}</td>
            <td class="px-3 py-2 align-top text-gray-700 dark:text-gray-300">{{ order.placedAt | date:'mediumDate' }}</td>
            <td class="px-3 py-2 align-top max-w-[180px] truncate text-gray-500 dark:text-gray-400"
                [title]="order.notes ?? ''">{{ order.notes ?? '—' }}</td>
          </tr>
        </app-data-table>
      </section>

      <footer class="flex flex-wrap items-center justify-between gap-2">
        <div class="flex items-center gap-2">
          <label for="pageSize" class="text-sm text-gray-500 dark:text-gray-400">Rows per page</label>
          <select id="pageSize" [class]="selectCls"
                  [value]="pageSize()" (change)="onPageSize($event)" aria-label="Rows per page">
            <option value="10">10</option>
            <option value="20">20</option>
            <option value="50">50</option>
          </select>
        </div>
        <div class="flex items-center gap-3">
          <span class="text-sm text-gray-500 dark:text-gray-400">
            Page {{ page() }} of {{ totalPages() }}
          </span>
          <app-pagination [page]="page()" [totalPages]="totalPages()" (pageChange)="onPage($event)" />
        </div>
      </footer>
    </main>
  `,
})
export class OrdersComponent implements OnInit {
  private readonly ordersSvc = inject(OrdersService);
  private readonly regionsSvc = inject(RegionsService);
  private readonly fb = inject(FormBuilder);

  readonly selectCls = SELECT_CLS;
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
    { key: 'total',     label: 'Total',     sortable: true, class: 'text-right' },
    { key: 'region',    label: 'Region',    sortable: false },
    { key: 'placedAt',  label: 'Date',      sortable: true },
    { key: 'notes',     label: 'Notes',     sortable: false },
  ];

  ngOnInit(): void {
    this.regionsSvc.list().subscribe((r) => this.regions.set(r));

    const controls = this.filterForm.controls;
    for (const ctrl of [controls.status, controls.regionCode, controls.from, controls.to]) {
      ctrl.valueChanges.pipe(distinctUntilChanged()).subscribe(() => {
        this.page.set(1);
        this.fetch();
      });
    }

    this.fetch();
  }

  commitSearch(): void {
    this.page.set(1);
    this.fetch();
  }

  onSearchInput(e: Event): void {
    if ((e.target as HTMLInputElement).value === '') {
      this.page.set(1);
      this.fetch();
    }
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
