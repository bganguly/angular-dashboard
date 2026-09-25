import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { CustomersService, RegionsService, CustomerDTO, RegionSummary } from '@angular-dashboard/data-access';
import { DataTableComponent, TableColumn } from '@angular-dashboard/ui';

@Component({
  selector: 'app-customers',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DataTableComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main id="main-content" class="container-fluid py-4" aria-label="Customers list">
      <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-3">
        <h1 class="h4 mb-0 fw-semibold">Customers</h1>
      </div>

      <form [formGroup]="filterForm" class="row g-2 mb-3" aria-label="Filter customers" role="search">
        <div class="col-12 col-md-5">
          <label for="customerSearch" class="visually-hidden">Search customers</label>
          <input id="customerSearch" type="search" class="form-control form-control-sm"
                 placeholder="Search name or email…" formControlName="q"
                 aria-label="Search customers" />
        </div>
        <div class="col-12 col-md-3">
          <label for="regionFilter" class="visually-hidden">Filter by region</label>
          <select id="regionFilter" class="form-select form-select-sm" formControlName="regionId" aria-label="Filter by region">
            <option value="">All regions</option>
            <option *ngFor="let r of regions()" [value]="r.id">{{ r.name }}</option>
          </select>
        </div>
      </form>

      <app-data-table [columns]="columns" [rows]="customers()" [loading]="loading()" caption="Customers table">
        <tr *ngFor="let c of customers()" tabindex="0">
          <td>{{ c.id }}</td>
          <td>{{ c.firstName }} {{ c.lastName }}</td>
          <td><a [href]="'mailto:' + c.email" aria-label="Email {{ c.firstName }}">{{ c.email }}</a></td>
          <td>{{ c.phone ?? '—' }}</td>
          <td>{{ c.region.name }}</td>
          <td>{{ c.createdAt | date:'mediumDate' }}</td>
        </tr>
      </app-data-table>

      <div class="d-flex justify-content-end mt-3 gap-2" aria-label="Load more controls">
        <button *ngIf="cursorStack().length > 1" class="btn btn-outline-secondary btn-sm"
                (click)="prevPage()" aria-label="Previous page">
          ← Prev
        </button>
        <button *ngIf="hasMore()" class="btn btn-outline-primary btn-sm"
                (click)="nextPage()" aria-label="Next page">
          Next →
        </button>
      </div>
    </main>
  `,
})
export class CustomersComponent implements OnInit {
  private readonly svc = inject(CustomersService);
  private readonly regionsSvc = inject(RegionsService);
  private readonly fb = inject(FormBuilder);

  readonly customers = signal<CustomerDTO[]>([]);
  readonly regions = signal<RegionSummary[]>([]);
  readonly loading = signal(false);
  readonly hasMore = signal(false);
  readonly cursorStack = signal<(number | null)[]>([null]);

  readonly filterForm = this.fb.group({ q: [''], regionId: [''] });

  readonly columns: TableColumn<CustomerDTO>[] = [
    { key: 'id',        label: 'ID'       },
    { key: 'firstName', label: 'Name'     },
    { key: 'email',     label: 'Email'    },
    { key: 'phone',     label: 'Phone'    },
    { key: 'region',    label: 'Region'   },
    { key: 'createdAt', label: 'Joined'   },
  ];

  ngOnInit(): void {
    this.regionsSvc.list().subscribe((r) => this.regions.set(r));
    this.filterForm.valueChanges.pipe(debounceTime(300), distinctUntilChanged()).subscribe(() => {
      this.cursorStack.set([null]);
      this.fetch();
    });
    this.fetch();
  }

  fetch(): void {
    const stack = this.cursorStack();
    const cursor = stack[stack.length - 1];
    const { q, regionId } = this.filterForm.value;
    this.loading.set(true);
    this.svc.list({ cursor, limit: 20, q, regionId: regionId ? Number(regionId) : null }).subscribe({
      next: (res) => {
        this.customers.set(res.data);
        this.hasMore.set(res.hasMore);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  nextPage(): void {
    const last = this.customers()[this.customers().length - 1];
    if (last) {
      this.cursorStack.update((s) => [...s, last.id]);
      this.fetch();
    }
  }

  prevPage(): void {
    if (this.cursorStack().length > 1) {
      this.cursorStack.update((s) => s.slice(0, -1));
      this.fetch();
    }
  }
}
