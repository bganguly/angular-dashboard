import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { CustomersService, RegionsService, CustomerDTO, RegionSummary } from '@angular-dashboard/data-access';
import { DataTableComponent, TableColumn } from '@angular-dashboard/ui';

const SELECT_CLS = 'rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100';

@Component({
  selector: 'app-customers',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DataTableComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main id="main-content" class="w-full px-5 py-8" aria-label="Customers list">
      <header class="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 class="text-2xl font-semibold tracking-tight text-gray-900 dark:text-gray-50">Customers</h1>
        </div>
      </header>

      <form [formGroup]="filterForm" aria-label="Filter customers" role="search">
        <div class="relative mb-3">
          <svg aria-hidden="true" viewBox="0 0 20 20" fill="none"
               class="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400">
            <circle cx="9" cy="9" r="6" stroke="currentColor" stroke-width="1.5"/>
            <path d="M14 14L18 18" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
          <label for="customerSearch" class="sr-only">Search customers</label>
          <input id="customerSearch" type="search" formControlName="q"
                 placeholder="Search name or email…"
                 class="w-full rounded-full border border-gray-300 bg-white py-3 pl-11 pr-4 text-base text-gray-900 shadow-sm outline-none placeholder:text-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
                 aria-label="Search customers" />
        </div>

        <div class="flex flex-wrap gap-2 mb-4">
          <label class="sr-only" for="regionFilter">Filter by region</label>
          <select id="regionFilter" [class]="selectCls" formControlName="regionId" aria-label="Filter by region">
            <option value="">All regions</option>
            <option *ngFor="let r of regions()" [value]="r.id">{{ r.name }}</option>
          </select>
        </div>
      </form>

      <section class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900 mb-4"
               aria-label="Customers table">
        <app-data-table [columns]="columns" [rows]="customers()" [loading]="loading()" caption="Customers table">
          <tr *ngFor="let c of customers()"
              class="border-b border-gray-100 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800/50 transition-colors"
              tabindex="0">
            <td class="px-3 py-2 align-top text-gray-900 dark:text-gray-100">{{ c.id }}</td>
            <td class="px-3 py-2 align-top text-gray-900 dark:text-gray-100">{{ c.firstName }} {{ c.lastName }}</td>
            <td class="px-3 py-2 align-top">
              <a [href]="'mailto:' + c.email"
                 [attr.aria-label]="'Email ' + c.firstName"
                 class="text-indigo-600 hover:underline dark:text-indigo-400">
                {{ c.email }}
              </a>
            </td>
            <td class="px-3 py-2 align-top text-gray-700 dark:text-gray-300">{{ c.phone ?? '—' }}</td>
            <td class="px-3 py-2 align-top text-gray-700 dark:text-gray-300">{{ c.region.name }}</td>
            <td class="px-3 py-2 align-top text-gray-700 dark:text-gray-300">{{ c.createdAt | date:'mediumDate' }}</td>
          </tr>
        </app-data-table>
      </section>

      <footer class="flex justify-end gap-2">
        <button *ngIf="cursorStack().length > 1"
                class="flex h-9 items-center rounded-md border border-gray-300 px-3 text-sm hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:hover:bg-gray-800"
                (click)="prevPage()" aria-label="Previous page">
          ← Prev
        </button>
        <button *ngIf="hasMore()"
                class="flex h-9 items-center rounded-md border border-gray-300 px-3 text-sm hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
                (click)="nextPage()" aria-label="Next page">
          Next →
        </button>
      </footer>
    </main>
  `,
})
export class CustomersComponent implements OnInit {
  private readonly svc = inject(CustomersService);
  private readonly regionsSvc = inject(RegionsService);
  private readonly fb = inject(FormBuilder);

  readonly selectCls = SELECT_CLS;
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
