import {
  Component, OnInit, OnDestroy, inject, signal, computed, effect,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BaseChartDirective } from 'ng2-charts';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import {
  AggregatesService, OrdersService, RegionsService,
  DailyAggregate, OrderDTO, RegionSummary, OrderStatus,
} from '@angular-dashboard/data-access';
import {
  PaginationComponent, StatusBadgeComponent, ThemeToggleComponent,
} from '@angular-dashboard/ui';

Chart.register(...registerables);

const TOP_N = 4;
const OTHER_KEY = 'Others';
const SLOW_WAKING_MS = 800;
const IDLE_RESET_MS = 15 * 60 * 1000;
const PALETTE = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4', '#a855f7', '#ec4899'];
const OTHER_COLOR = '#94a3b8';
const DRAG_DEBOUNCE_MS = 250;
const ALL_DATES_FROM = '2019-01-01';
const ORDER_STATUSES: OrderStatus[] = [
  'PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED',
];

interface DashFilters {
  status: string[];
  regionCodes: string[];
  from: string;
  to: string;
  totalMin: string;
  totalMax: string;
}

interface AggregateBucket {
  date: string;
  [key: string]: string | number;
}

const FIELD_CLS = 'w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule, FormsModule, BaseChartDirective,
    PaginationComponent, StatusBadgeComponent, ThemeToggleComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    .brush-range {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 32px;
      pointer-events: none;
      background: transparent;
      -webkit-appearance: none;
      appearance: none;
      margin: 0;
    }
    .brush-range::-webkit-slider-thumb {
      pointer-events: all;
      -webkit-appearance: none;
      appearance: none;
      height: 22px;
      width: 22px;
      border-radius: 50%;
      background: #6366f1;
      cursor: ew-resize;
      border: 3px solid white;
      box-shadow: 0 0 0 2px rgba(99,102,241,0.4), 0 1px 4px rgba(0,0,0,0.2);
    }
    .brush-range::-moz-range-thumb {
      pointer-events: all;
      height: 22px;
      width: 22px;
      border-radius: 50%;
      background: #6366f1;
      cursor: ew-resize;
      border: 3px solid white;
      box-shadow: 0 0 0 2px rgba(99,102,241,0.4), 0 1px 4px rgba(0,0,0,0.2);
    }
    .brush-range::-webkit-slider-runnable-track { background: transparent; }
    .brush-range::-moz-range-track { background: transparent; height: 0; }
  `],
  template: `
<main id="main-content" class="w-full px-5 py-8" aria-label="Dashboard">

  <div *ngIf="dbStatus()"
       class="mb-4 flex items-center gap-2 rounded-md px-3 py-1.5 text-sm w-fit"
       [style.background]="dbStatus() === 'waking' ? 'rgba(251,191,36,0.12)' : 'rgba(34,197,94,0.12)'"
       [style.border]="dbStatus() === 'waking' ? '1px solid rgba(251,191,36,0.30)' : '1px solid rgba(34,197,94,0.30)'"
       [style.color]="dbStatus() === 'waking' ? '#fbbf24' : '#4ade80'">
    <ng-container *ngIf="dbStatus() === 'waking'">
      <svg class="h-4 w-4 shrink-0 animate-spin" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" stroke-dasharray="60" stroke-dashoffset="20"/>
      </svg>
      <span>Backend waking from idle —</span>
      <span class="font-mono tabular-nums opacity-70">{{ wakeSecs() }}s</span>
    </ng-container>
    <ng-container *ngIf="dbStatus() === 'ready'">
      <svg class="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
      <span>Backend live — queries back to normal</span>
    </ng-container>
  </div>

  <div class="flex flex-col gap-6 lg:flex-row">

    <!-- ─── SIDEBAR ──────────────────────────────────────────────────── -->
    <div class="lg:w-64 lg:shrink-0">

      <button type="button"
              class="mb-4 inline-flex items-center gap-2 rounded-md border border-gray-300 px-3 py-1.5 text-sm lg:hidden dark:border-gray-700"
              (click)="sidebarOpen.set(true)">
        Filters{{ activeFilterCount() > 0 ? ' (' + activeFilterCount() + ')' : '' }}
      </button>

      <div *ngIf="sidebarOpen()"
           class="fixed inset-0 z-40 bg-black/40 lg:hidden"
           aria-hidden="true"
           (click)="sidebarOpen.set(false)"></div>

      <aside
        class="fixed inset-y-0 left-0 z-50 w-72 overflow-y-auto border-r border-gray-200 bg-white p-4 shadow-lg transition-transform dark:border-gray-800 dark:bg-gray-900 lg:static lg:z-auto lg:translate-x-0 lg:rounded-lg lg:border lg:shadow-sm"
        [class.-translate-x-full]="!sidebarOpen()"
        [class.translate-x-0]="sidebarOpen()"
        [class.lg:w-12]="sidebarCollapsed()"
        [class.lg:w-64]="!sidebarCollapsed()">

        <header class="mb-4 flex items-center justify-between">
          <h2 class="text-base font-semibold text-gray-900 dark:text-gray-50"
              [class.lg:hidden]="sidebarCollapsed()">Filters</h2>
          <button type="button"
                  class="hidden rounded-md p-1 text-gray-500 hover:bg-gray-100 lg:block dark:hover:bg-gray-800"
                  [attr.aria-label]="sidebarCollapsed() ? 'Expand filters' : 'Collapse filters'"
                  (click)="toggleSidebarCollapsed()">
            {{ sidebarCollapsed() ? '»' : '«' }}
          </button>
          <button type="button"
                  class="rounded-md p-1 text-gray-500 hover:bg-gray-100 lg:hidden dark:hover:bg-gray-800"
                  aria-label="Close filters"
                  (click)="sidebarOpen.set(false)">×</button>
        </header>

        <div [class.lg:hidden]="sidebarCollapsed()">

          <!-- Active chips + clear all -->
          <div *ngIf="!isEmptyFilters()" class="mb-4 space-y-2">
            <div class="flex flex-wrap gap-1.5">
              <span *ngFor="let s of filters().status"
                    class="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-xs text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                {{ s }}
                <button type="button" (click)="toggleStatus(s)"
                        [attr.aria-label]="'Remove ' + s"
                        class="text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-200">×</button>
              </span>
              <span *ngFor="let code of filters().regionCodes"
                    class="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-xs text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                {{ regionNameFor(code) }}
                <button type="button" (click)="toggleRegion(code)"
                        [attr.aria-label]="'Remove region ' + code"
                        class="text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-200">×</button>
              </span>
              <span *ngIf="allDates()"
                    class="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-xs text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                All dates
                <button type="button" (click)="toggleAllDates()"
                        aria-label="Remove all dates filter"
                        class="text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-200">×</button>
              </span>
              <span *ngIf="!allDates() && (filters().from || filters().to)"
                    class="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-xs text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                {{ filters().from || '…' }} → {{ filters().to || '…' }}
                <button type="button" (click)="patchFilters({ from: '', to: '' })"
                        aria-label="Remove date filter"
                        class="text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-200">×</button>
              </span>
              <span *ngIf="filters().totalMin || filters().totalMax"
                    class="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-xs text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                \${{ filters().totalMin || '0' }} – \${{ filters().totalMax || '∞' }}
                <button type="button" (click)="patchFilters({ totalMin: '', totalMax: '' })"
                        aria-label="Remove total filter"
                        class="text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-200">×</button>
              </span>
            </div>
            <button type="button"
                    class="text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400"
                    (click)="clearFilters()">Clear all</button>
          </div>

          <!-- Status -->
          <fieldset class="mb-5 space-y-1.5">
            <legend class="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Status</legend>
            <label *ngFor="let s of statuses"
                   class="flex cursor-pointer items-center gap-2 rounded-md px-1 py-0.5 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800">
              <input type="checkbox"
                     [checked]="filters().status.includes(s)"
                     (change)="toggleStatus(s)"
                     class="h-3.5 w-3.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
              {{ s }}
            </label>
          </fieldset>

          <!-- Region -->
          <fieldset class="mb-5 space-y-2">
            <legend class="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">Region</legend>
            <div *ngIf="filters().regionCodes.length" class="flex flex-wrap gap-1">
              <span *ngFor="let code of filters().regionCodes"
                    class="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-xs text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                {{ regionNameFor(code) }}
                <button type="button" (click)="toggleRegion(code)"
                        [attr.aria-label]="'Remove region ' + code"
                        class="text-indigo-400 hover:text-indigo-600">×</button>
              </span>
            </div>
            <input type="search"
                   [value]="regionSearch()"
                   (input)="onRegionSearch($event)"
                   placeholder="Search region…"
                   [class]="fieldCls"
                   aria-label="Search regions" />
            <div class="max-h-44 overflow-y-auto rounded-md border border-gray-200 bg-white py-1 dark:border-gray-700 dark:bg-gray-950">
              <p *ngIf="regions().length === 0"
                 class="px-2 py-1 text-xs text-gray-400">No regions loaded yet.</p>
              <p *ngIf="regions().length > 0 && filteredRegions().length === 0"
                 class="px-2 py-1 text-xs text-gray-400">No matches.</p>
              <button *ngFor="let r of filteredRegions()"
                      type="button"
                      (click)="toggleRegion(r.code)"
                      class="flex w-full items-center justify-between px-2 py-1 text-left text-sm"
                      [class.bg-indigo-50]="filters().regionCodes.includes(r.code)"
                      [class.text-indigo-700]="filters().regionCodes.includes(r.code)"
                      [class.dark:bg-indigo-950]="filters().regionCodes.includes(r.code)"
                      [class.dark:text-indigo-300]="filters().regionCodes.includes(r.code)"
                      [class.text-gray-700]="!filters().regionCodes.includes(r.code)"
                      [class.hover:bg-gray-100]="!filters().regionCodes.includes(r.code)"
                      [class.dark:text-gray-200]="!filters().regionCodes.includes(r.code)"
                      [class.dark:hover:bg-gray-800]="!filters().regionCodes.includes(r.code)">
                <span>{{ r.name }}</span>
                <span *ngIf="filters().regionCodes.includes(r.code)" aria-hidden>✓</span>
              </button>
            </div>
          </fieldset>

          <!-- Date range -->
          <fieldset class="mb-5 space-y-1.5">
            <legend class="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">Placed date</legend>
            <label class="flex cursor-pointer items-center gap-2 rounded-md px-1 py-0.5 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800">
              <input type="checkbox" [checked]="allDates()" (change)="toggleAllDates()"
                     class="h-3.5 w-3.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
              All dates
            </label>
            <ng-container *ngIf="!allDates()">
              <label class="block text-xs text-gray-500 dark:text-gray-400">
                From
                <input type="date" [value]="filters().from" (change)="onDateFrom($event)" [class]="fieldCls" />
              </label>
              <label class="block text-xs text-gray-500 dark:text-gray-400">
                To
                <input type="date" [value]="filters().to" (change)="onDateTo($event)" [class]="fieldCls" />
              </label>
            </ng-container>
          </fieldset>

          <!-- Order total range -->
          <fieldset class="mb-2 space-y-1.5">
            <legend class="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">Order total</legend>
            <div class="flex items-center gap-2">
              <input type="number" inputmode="decimal" min="0" placeholder="Min"
                     [value]="localMin" (input)="onTotalMin($event)"
                     [class]="fieldCls" aria-label="Minimum order total" />
              <span class="text-gray-400">–</span>
              <input type="number" inputmode="decimal" min="0" placeholder="Max"
                     [value]="localMax" (input)="onTotalMax($event)"
                     [class]="fieldCls" aria-label="Maximum order total" />
            </div>
          </fieldset>

        </div>
      </aside>
    </div>

    <!-- ─── MAIN CONTENT ──────────────────────────────────────────────── -->
    <div class="min-w-0 flex-1 space-y-6">

      <!-- CHART SECTION -->
      <section class="relative rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900"
               aria-label="Aggregates chart">

        <header class="mb-3 flex items-center justify-between">
          <div>
            <h2 class="text-base font-semibold text-gray-900 dark:text-gray-50">Aggregates</h2>
            <p class="text-xs text-gray-500 dark:text-gray-400">
              {{ brushStartDate() }} → {{ brushEndDate() }}<span class="ml-2 text-gray-400">drag slider to narrow</span>
            </p>
          </div>
          <span *ngIf="chartLoading()" class="text-xs text-indigo-500" aria-live="polite">updating…</span>
        </header>

        <!-- Loading / empty state -->
        <div *ngIf="chartLoading() && !chartData().labels?.length"
             class="flex h-72 flex-col items-center justify-center gap-2 text-sm text-gray-400" aria-live="polite">
          <span class="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-indigo-500 dark:border-gray-700 dark:border-t-indigo-400"
                role="status" aria-label="Loading chart"></span>
        </div>
        <div *ngIf="!chartLoading() && !chartData().datasets.length"
             class="flex h-72 items-center justify-center text-sm text-gray-400 dark:text-gray-500">
          No data for selected range.
        </div>

        <!-- Chart canvas -->
        <div *ngIf="chartData().datasets.length" style="height:288px; position:relative;">
          <canvas baseChart
                  [data]="chartData()"
                  [options]="chartOptions"
                  type="bar"
                  role="img"
                  aria-label="Stacked bar chart of daily orders by category">
          </canvas>
        </div>

        <!-- Custom legend -->
        <div *ngIf="categoryTotals().length"
             class="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs">
          <span *ngFor="let item of categoryTotals()"
                class="inline-flex items-center gap-1.5 whitespace-nowrap text-gray-500 dark:text-gray-400">
            <ng-container *ngIf="item.cat !== OTHER_KEY">
              <span aria-hidden class="h-2.5 w-2.5 shrink-0 rounded-sm" [style.backgroundColor]="colorFor(item.cat)"></span>
              {{ item.cat }}
              <span class="font-medium tabular-nums text-gray-900 dark:text-gray-100">{{ item.total | number }}</span>
            </ng-container>
          </span>
          <label *ngIf="hasOthers()"
                 class="inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap text-gray-500 dark:text-gray-400 select-none">
            <input type="checkbox" [checked]="showOthers()" (change)="toggleOthers()"
                   class="h-3.5 w-3.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                   aria-label="Show others bar series" />
            Others
            <span *ngIf="showOthers() && othersTotal() !== null" class="font-medium tabular-nums text-gray-900 dark:text-gray-100">
              {{ othersTotal() | number }}
            </span>
          </label>
        </div>

        <!-- Brush slider -->
        <div *ngIf="allBucketsCount() > 1" class="mt-4 px-1">
          <div class="relative h-8">
            <div class="absolute inset-x-0 h-1.5 rounded-full bg-gray-200 dark:bg-gray-700"
                 style="top:50%;transform:translateY(-50%)">
              <div class="absolute h-full rounded-full bg-indigo-500"
                   [style.left.%]="brushStartPct()"
                   [style.width.%]="brushEndPct() - brushStartPct()"></div>
            </div>
            <input type="range" class="brush-range"
                   [min]="0" [max]="allBucketsCount() - 1" [value]="brushStart()"
                   (input)="onBrushStart($event)" (change)="commitBrush()"
                   aria-label="Chart range start" />
            <input type="range" class="brush-range"
                   [min]="0" [max]="allBucketsCount() - 1" [value]="brushEnd()"
                   (input)="onBrushEnd($event)" (change)="commitBrush()"
                   aria-label="Chart range end" />
          </div>
          <div class="mt-1 flex justify-between text-[11px] text-gray-400 dark:text-gray-500">
            <span>{{ brushStartDate() }}</span>
            <span class="italic opacity-60">drag to zoom · releases update orders</span>
            <span>{{ brushEndDate() }}</span>
          </div>
        </div>

      </section>

      <!-- ORDERS TABLE SECTION -->
      <section class="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900"
               aria-label="Orders list">

        <div class="px-6 pt-5 pb-3">
          <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 class="text-base font-semibold text-gray-900 dark:text-gray-50">Orders</h2>
            <p class="text-sm text-gray-500 dark:text-gray-400" aria-live="polite">
              {{ total() | number }}{{ approximate() ? ' (approx.)' : '' }} results
            </p>
          </div>

          <!-- Search bar -->
          <div class="relative">
            <svg aria-hidden="true" viewBox="0 0 20 20" fill="none"
                 class="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400">
              <circle cx="9" cy="9" r="6" stroke="currentColor" stroke-width="1.5"/>
              <path d="M14 14L18 18" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
            <label for="ordersSearch" class="sr-only">Search orders</label>
            <input id="ordersSearch" type="search" [value]="searchQuery()"
                   placeholder="Search name, email, notes… (press Enter)"
                   class="w-full rounded-full border border-gray-300 bg-white py-2.5 pl-11 pr-4 text-sm text-gray-900 shadow-sm outline-none placeholder:text-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
                   (keydown.enter)="commitSearch()"
                   (input)="onSearchInput($event)" />
          </div>
        </div>

        <!-- Table -->
        <div class="overflow-x-auto">
          <table class="w-full border-collapse text-sm" role="grid">
            <thead>
              <tr class="border-b border-gray-200 text-left dark:border-gray-800">
                <th class="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400">ID</th>
                <th class="cursor-pointer px-3 py-2 text-xs font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    (click)="onSort('customer')">
                  Customer
                  <span *ngIf="sortKey() === 'customer'" class="ml-0.5 text-indigo-500">{{ sortDir() === 'asc' ? '▲' : '▼' }}</span>
                </th>
                <th class="cursor-pointer px-3 py-2 text-xs font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    (click)="onSort('status')">
                  Status
                  <span *ngIf="sortKey() === 'status'" class="ml-0.5 text-indigo-500">{{ sortDir() === 'asc' ? '▲' : '▼' }}</span>
                </th>
                <th class="cursor-pointer px-3 py-2 text-right text-xs font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    (click)="onSort('total')">
                  Total
                  <span *ngIf="sortKey() === 'total'" class="ml-0.5 text-indigo-500">{{ sortDir() === 'asc' ? '▲' : '▼' }}</span>
                </th>
                <th class="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400">Region</th>
                <th class="cursor-pointer px-3 py-2 text-xs font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    (click)="onSort('placedAt')">
                  Date
                  <span *ngIf="sortKey() === 'placedAt'" class="ml-0.5 text-indigo-500">{{ sortDir() === 'asc' ? '▲' : '▼' }}</span>
                </th>
                <th class="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400">Notes</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngIf="ordersLoading()">
                <td colspan="7" class="py-10 text-center">
                  <span class="inline-block h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-indigo-500 dark:border-gray-700 dark:border-t-indigo-400"
                        role="status" aria-label="Loading"></span>
                </td>
              </tr>
              <tr *ngIf="!ordersLoading() && orders().length === 0">
                <td colspan="7" class="py-12 text-center text-sm text-gray-400 dark:text-gray-500">
                  No results found.
                </td>
              </tr>
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
            </tbody>
          </table>
        </div>

        <!-- Pagination footer -->
        <footer class="flex flex-wrap items-center justify-between gap-2 px-6 py-4">
          <div class="flex items-center gap-2">
            <label for="pageSize" class="text-sm text-gray-500 dark:text-gray-400">Rows per page</label>
            <select id="pageSize"
                    class="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900 outline-none dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
                    [value]="pageSize()" (change)="onPageSize($event)"
                    aria-label="Rows per page">
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

      </section>
    </div>
  </div>
</main>
  `,
})
export class DashboardComponent implements OnInit, OnDestroy {
  private readonly aggSvc = inject(AggregatesService);
  private readonly ordersSvc = inject(OrdersService);
  private readonly regionsSvc = inject(RegionsService);

  readonly fieldCls = FIELD_CLS;
  readonly statuses = ORDER_STATUSES;
  readonly OTHER_KEY = OTHER_KEY;

  // Sidebar
  readonly sidebarOpen = signal(false);
  readonly sidebarCollapsed = signal(false);
  readonly regionSearch = signal('');
  readonly allDates = signal(false);

  // Filters
  readonly filters = signal<DashFilters>({
    status: [],
    regionCodes: [],
    from: (() => { const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().slice(0, 10); })(),
    to: new Date().toISOString().slice(0, 10),
    totalMin: '',
    totalMax: '',
  });

  // Debounced total inputs
  localMin = '';
  localMax = '';
  private totalDebounce: ReturnType<typeof setTimeout> | null = null;

  // Backend wake detection
  readonly dbStatus = signal<'waking' | 'ready' | null>(null);
  readonly wakeMs = signal(0);
  readonly wakeSecs = computed(() => (this.wakeMs() / 1000).toFixed(1));
  private dbWarm = false;
  private lastActivityAt = 0;
  private wakeTimer: ReturnType<typeof setTimeout> | null = null;
  private dbStatusDismiss: ReturnType<typeof setTimeout> | null = null;
  private wakeIntervalRef: ReturnType<typeof setInterval> | null = null;
  private wakeStartTime = 0;

  // Chart
  readonly chartLoading = signal(false);
  readonly showOthers = signal(false);
  readonly hasOthers = signal(false);
  readonly allBuckets = signal<AggregateBucket[]>([]);
  readonly brushStart = signal(0);
  readonly brushEnd = signal(0);
  private topCats: string[] = [];
  private colorMap = new Map<string, string>();

  readonly categoryTotals = signal<Array<{ cat: string; total: number }>>([]);

  readonly chartData = signal<ChartConfiguration<'bar'>['data']>({ labels: [], datasets: [] });
  readonly chartOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { mode: 'index', intersect: false },
    },
    scales: {
      x: { stacked: true, ticks: { font: { size: 11 } } },
      y: {
        stacked: true,
        ticks: {
          callback: (v: string | number) => {
            const n = Number(v);
            if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
            if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
            return String(n);
          },
        },
      },
    },
  };

  // Brush computed
  readonly allBucketsCount = computed(() => this.allBuckets().length);
  readonly brushStartPct = computed(() => {
    const n = this.allBucketsCount();
    return n <= 1 ? 0 : (this.brushStart() / (n - 1)) * 100;
  });
  readonly brushEndPct = computed(() => {
    const n = this.allBucketsCount();
    return n <= 1 ? 100 : (this.brushEnd() / (n - 1)) * 100;
  });
  readonly brushStartDate = computed(() =>
    this.fmtDate(this.allBuckets()[this.brushStart()]?.date ?? ''));
  readonly brushEndDate = computed(() =>
    this.fmtDate(this.allBuckets()[this.brushEnd()]?.date ?? ''));
  readonly othersTotal = computed(() => {
    const others = this.categoryTotals().find(c => c.cat === OTHER_KEY);
    return others?.total ?? null;
  });

  // Orders
  readonly ordersLoading = signal(false);
  readonly orders = signal<OrderDTO[]>([]);
  readonly total = signal(0);
  readonly totalPages = signal(0);
  readonly approximate = signal(false);
  readonly page = signal(1);
  readonly pageSize = signal(20);
  readonly sortKey = signal('placedAt');
  readonly sortDir = signal<'asc' | 'desc'>('desc');
  readonly searchQuery = signal('');

  // Regions
  readonly regions = signal<RegionSummary[]>([]);

  readonly filteredRegions = computed(() => {
    const q = this.regionSearch().trim().toLowerCase();
    const all = this.regions();
    if (!q) return all;
    return all.filter(r =>
      r.name.toLowerCase().includes(q) || r.code.toLowerCase().includes(q),
    );
  });

  readonly activeFilterCount = computed(() => {
    const f = this.filters();
    return (
      f.status.length + f.regionCodes.length +
      (this.allDates() || f.from || f.to ? 1 : 0) +
      (f.totalMin || f.totalMax ? 1 : 0)
    );
  });

  readonly isEmptyFilters = computed(() => this.activeFilterCount() === 0);

  private brushDebounce: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    effect(() => {
      const status = this.dbStatus();
      if (status === 'waking') {
        this.wakeStartTime = Date.now();
        this.wakeMs.set(30_000);
        this.wakeIntervalRef = setInterval(() => {
          this.wakeMs.set(Math.max(0, 30_000 - (Date.now() - this.wakeStartTime)));
        }, 100);
      } else {
        if (this.wakeIntervalRef) { clearInterval(this.wakeIntervalRef); this.wakeIntervalRef = null; }
        this.wakeMs.set(0);
      }
    });
  }

  ngOnInit(): void {
    this.regionsSvc.list().subscribe(r => this.regions.set(r));
    this.loadChart();
    this.loadOrders();
  }

  ngOnDestroy(): void {
    if (this.brushDebounce) clearTimeout(this.brushDebounce);
    if (this.totalDebounce) clearTimeout(this.totalDebounce);
    if (this.wakeTimer) clearTimeout(this.wakeTimer);
    if (this.dbStatusDismiss) clearTimeout(this.dbStatusDismiss);
    if (this.wakeIntervalRef) clearInterval(this.wakeIntervalRef);
  }

  // ── Sidebar ───────────────────────────────────────────────────────────

  toggleSidebarCollapsed(): void {
    this.sidebarCollapsed.update(v => !v);
  }

  // ── Filter mutations ──────────────────────────────────────────────────

  patchFilters(patch: Partial<DashFilters>): void {
    this.filters.update(f => ({ ...f, ...patch }));
    this.page.set(1);
    this.loadChart();
    this.loadOrders();
  }

  toggleStatus(s: string): void {
    const cur = this.filters().status;
    this.patchFilters({
      status: cur.includes(s) ? cur.filter(x => x !== s) : [...cur, s],
    });
  }

  toggleRegion(code: string): void {
    const cur = this.filters().regionCodes;
    this.patchFilters({
      regionCodes: cur.includes(code) ? cur.filter(x => x !== code) : [...cur, code],
    });
  }

  clearFilters(): void {
    this.localMin = '';
    this.localMax = '';
    this.allDates.set(false);
    this.filters.set({
      status: [], regionCodes: [], from: '', to: '', totalMin: '', totalMax: '',
    });
    this.page.set(1);
    this.loadChart();
    this.loadOrders();
  }

  toggleAllDates(): void {
    const next = !this.allDates();
    this.allDates.set(next);
    if (next) {
      this.filters.update(f => ({ ...f, from: '', to: '' }));
    } else {
      this.filters.update(f => ({ ...f, from: this.defaultFrom(), to: this.defaultTo() }));
    }
    this.page.set(1);
    this.loadChart();
    this.loadOrders();
  }

  onDateFrom(e: Event): void {
    this.patchFilters({ from: (e.target as HTMLInputElement).value });
  }

  onDateTo(e: Event): void {
    this.patchFilters({ to: (e.target as HTMLInputElement).value });
  }

  onTotalMin(e: Event): void {
    const val = (e.target as HTMLInputElement).value;
    this.localMin = val;
    if (this.totalDebounce) clearTimeout(this.totalDebounce);
    this.totalDebounce = setTimeout(() =>
      this.patchFilters({ totalMin: val, totalMax: this.localMax }), 400);
  }

  onTotalMax(e: Event): void {
    const val = (e.target as HTMLInputElement).value;
    this.localMax = val;
    if (this.totalDebounce) clearTimeout(this.totalDebounce);
    this.totalDebounce = setTimeout(() =>
      this.patchFilters({ totalMax: val, totalMin: this.localMin }), 400);
  }

  onRegionSearch(e: Event): void {
    this.regionSearch.set((e.target as HTMLInputElement).value);
  }

  // ── Chart ────────────────────────────────────────────────────────────

  loadChart(): void {
    const f = this.filters();
    const from = this.allDates() ? ALL_DATES_FROM : (f.from || this.defaultFrom());
    const to = this.allDates() ? this.defaultTo() : (f.to || this.defaultTo());

    const timeSinceLast = this.lastActivityAt > 0 ? Date.now() - this.lastActivityAt : Infinity;
    if (this.dbWarm && timeSinceLast > IDLE_RESET_MS) this.dbWarm = false;
    if (!this.dbWarm && this.dbStatus() === null) {
      this.wakeTimer = setTimeout(() => this.dbStatus.set('waking'), SLOW_WAKING_MS);
    }

    this.chartLoading.set(true);
    this.aggSvc.get(from, to, TOP_N + 1, {
      q: this.searchQuery() || null,
      status: f.status.length ? f.status.join(',') : null,
      regionCode: f.regionCodes.length ? f.regionCodes.join(',') : null,
      minTotal: f.totalMin || null,
      maxTotal: f.totalMax || null,
    }).subscribe({
      next: (res) => {
        this.clearWakeTimer();
        this.lastActivityAt = Date.now();
        if (this.dbStatus() === 'waking') {
          this.dbStatus.set('ready');
          this.dbStatusDismiss = setTimeout(() => { this.dbStatus.set(null); this.dbWarm = true; }, 2500);
        } else {
          this.dbWarm = true;
        }
        this.buildChart(res.data ?? []);
        this.chartLoading.set(false);
      },
      error: () => { this.clearWakeTimer(); this.chartLoading.set(false); },
    });
  }

  private clearWakeTimer(): void {
    if (this.wakeTimer) { clearTimeout(this.wakeTimer); this.wakeTimer = null; }
  }

  private buildChart(data: DailyAggregate[]): void {
    this.showOthers.set(false);
    const totals = new Map<string, number>();
    for (const day of data) {
      for (const [cat, c] of Object.entries(day.categories ?? {})) {
        totals.set(cat, (totals.get(cat) ?? 0) + (c.totalOrders ?? 0));
      }
    }

    // Exclude the backend's pre-aggregated Others so it never lands in topCats
    const sorted = [...totals.entries()]
      .filter(([cat]) => cat !== OTHER_KEY)
      .sort((a, b) => b[1] - a[1]);

    this.topCats = sorted.slice(0, TOP_N).map(([cat]) => cat);
    const topSet = new Set(this.topCats);

    const backendOthers = totals.get(OTHER_KEY) ?? 0;
    const has = backendOthers > 0 || sorted.length > TOP_N;
    this.hasOthers.set(has);

    this.colorMap.clear();
    this.topCats.forEach((cat, i) => this.colorMap.set(cat, PALETTE[i % PALETTE.length]));

    const cats = this.topCats.map(cat => ({ cat, total: totals.get(cat) ?? 0 }));
    if (has) {
      const namedOthersSum = sorted.slice(TOP_N).reduce((s, [, v]) => s + v, 0);
      cats.push({ cat: OTHER_KEY, total: backendOthers + namedOthersSum });
    }
    this.categoryTotals.set(cats);

    const buckets: AggregateBucket[] = data.map(entry => {
      const bucket: AggregateBucket = { date: entry.date };
      for (const cat of this.topCats) bucket[cat] = 0;
      if (has) bucket[OTHER_KEY] = 0;
      for (const [cat, c] of Object.entries(entry.categories ?? {})) {
        // backend's Others key and any named cat not in topSet both fold into Others
        const key = topSet.has(cat) ? cat : (has ? OTHER_KEY : null);
        if (key) bucket[key] = (bucket[key] as number) + (c.totalOrders ?? 0);
      }
      return bucket;
    });

    this.allBuckets.set(buckets);
    this.brushStart.set(0);
    this.brushEnd.set(Math.max(0, buckets.length - 1));
    this.rebuildChart();
  }

  private rebuildChart(): void {
    const all = this.allBuckets();
    const display = all.slice(this.brushStart(), this.brushEnd() + 1);

    const datasets = this.topCats.map(cat => ({
      label: cat,
      data: display.map(b => b[cat] as number ?? 0),
      backgroundColor: this.colorMap.get(cat) ?? OTHER_COLOR,
      stack: 'agg',
      borderRadius: 0,
    }));

    if (this.showOthers() && this.hasOthers()) {
      datasets.push({
        label: OTHER_KEY,
        data: display.map(b => b[OTHER_KEY] as number ?? 0),
        backgroundColor: OTHER_COLOR,
        stack: 'agg',
        borderRadius: 0,
      });
    }

    if (datasets.length) {
      datasets[datasets.length - 1] = {
        ...datasets[datasets.length - 1],
        borderRadius: 4,
      } as typeof datasets[number];
    }

    this.chartData.set({
      labels: display.map(b => String(b.date)),
      datasets,
    });
  }

  toggleOthers(): void {
    this.showOthers.update(v => !v);
    this.rebuildChart();
  }

  // ── Brush ────────────────────────────────────────────────────────────

  onBrushStart(e: Event): void {
    const val = Number((e.target as HTMLInputElement).value);
    if (val >= this.brushEnd()) return;
    this.brushStart.set(val);
    this.rebuildChart();
  }

  onBrushEnd(e: Event): void {
    const val = Number((e.target as HTMLInputElement).value);
    if (val <= this.brushStart()) return;
    this.brushEnd.set(val);
    this.rebuildChart();
  }

  commitBrush(): void {
    const all = this.allBuckets();
    if (!all.length) return;
    const from = String(all[this.brushStart()].date);
    const to = String(all[this.brushEnd()].date);
    if (this.brushDebounce) clearTimeout(this.brushDebounce);
    this.brushDebounce = setTimeout(() => {
      this.filters.update(f => ({ ...f, from, to }));
      this.page.set(1);
      this.loadOrders();
    }, DRAG_DEBOUNCE_MS);
  }

  // ── Orders ───────────────────────────────────────────────────────────

  loadOrders(): void {
    const f = this.filters();
    this.ordersLoading.set(true);
    this.ordersSvc.list({
      q: this.searchQuery() || null,
      status: f.status.length ? f.status.join(',') : null,
      regionCode: f.regionCodes.length ? f.regionCodes.join(',') : null,
      from: f.from || null,
      to: f.to || null,
      minTotal: f.totalMin ? Number(f.totalMin) : null,
      maxTotal: f.totalMax ? Number(f.totalMax) : null,
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
        this.ordersLoading.set(false);
      },
      error: () => this.ordersLoading.set(false),
    });
  }

  commitSearch(): void {
    this.page.set(1);
    this.loadChart();
    this.loadOrders();
  }

  onSearchInput(e: Event): void {
    const val = (e.target as HTMLInputElement).value;
    this.searchQuery.set(val);
    if (!val) { this.page.set(1); this.loadChart(); this.loadOrders(); }
  }

  onSort(key: string): void {
    if (this.sortKey() === key) {
      this.sortDir.update(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortKey.set(key);
      this.sortDir.set('desc');
    }
    this.page.set(1);
    this.loadOrders();
  }

  onPage(p: number): void {
    this.page.set(p);
    this.loadOrders();
  }

  onPageSize(e: Event): void {
    this.pageSize.set(Number((e.target as HTMLSelectElement).value));
    this.page.set(1);
    this.loadOrders();
  }

  // ── Helpers ──────────────────────────────────────────────────────────

  colorFor(key: string): string {
    return key === OTHER_KEY ? OTHER_COLOR : (this.colorMap.get(key) ?? OTHER_COLOR);
  }

  regionNameFor(code: string): string {
    return this.regions().find(r => r.code === code)?.name ?? code;
  }

  private fmtDate(iso: string): string {
    if (!iso) return '';
    const d = new Date(iso + 'T00:00:00Z');
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
  }

  private defaultFrom(): string {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  }

  private defaultTo(): string {
    return new Date().toISOString().slice(0, 10);
  }
}
