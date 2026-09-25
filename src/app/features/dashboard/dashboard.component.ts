import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { BaseChartDirective } from 'ng2-charts';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { AggregatesService, DailyAggregate } from '@angular-dashboard/data-access';
import { KpiCardComponent } from '@angular-dashboard/ui';

Chart.register(...registerables);

const TOP_N = 4;
const OTHER_KEY = 'Others';
const OTHER_COLOR = '#94a3b8';
const PALETTE = ['#4f46e5', '#7c3aed', '#059669', '#d97706', '#dc2626', '#0891b2', '#ca8a04'];

const INPUT_CLS = 'rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, BaseChartDirective, KpiCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main id="main-content" class="w-full px-5 py-8" aria-label="Dashboard overview">
      <header class="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 class="text-2xl font-semibold tracking-tight text-gray-900 dark:text-gray-50">Overview</h1>
          <p class="text-sm text-gray-500 dark:text-gray-400">Aggregates, revenue, and order summary.</p>
        </div>
        <form [formGroup]="rangeForm" class="flex items-center gap-2" role="search"
              aria-label="Date range filter">
          <label for="dateFrom" class="sr-only">From date</label>
          <input id="dateFrom" type="date" [class]="inputCls"
                 formControlName="from" (change)="load()" aria-label="From date" />
          <span class="text-gray-400" aria-hidden="true">—</span>
          <label for="dateTo" class="sr-only">To date</label>
          <input id="dateTo" type="date" [class]="inputCls"
                 formControlName="to" (change)="load()" aria-label="To date" />
        </form>
      </header>

      <div class="grid grid-cols-2 gap-3 mb-6 lg:grid-cols-4" role="region"
           aria-label="Key performance indicators">
        <app-kpi-card label="Total Orders" [value]="totalOrders()" />
        <app-kpi-card label="Total Revenue" [value]="totalRevenue()" />
        <app-kpi-card label="Avg Order Value" [value]="avgOrderValue()" />
        <app-kpi-card label="Days in Range" [value]="daysInRange()" />
      </div>

      <section class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900"
               aria-label="Daily revenue by category">
        <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 class="text-base font-semibold text-gray-900 dark:text-gray-50">Daily Revenue by Category</h2>
          <label *ngIf="hasOthers()" class="inline-flex cursor-pointer items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400 select-none">
            <input type="checkbox" [checked]="showOthers()" (change)="toggleOthers()"
                   class="h-3.5 w-3.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                   aria-label="Show others bar series" />
            Show others
          </label>
        </div>
        <div *ngIf="loading()" class="flex justify-center py-10" aria-live="polite">
          <span class="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-indigo-500 dark:border-gray-700 dark:border-t-indigo-400"
                role="status" aria-label="Loading chart data"></span>
        </div>
        <canvas *ngIf="!loading() && chartData.datasets.length"
                baseChart
                [data]="chartData"
                [options]="chartOptions"
                type="bar"
                role="img"
                aria-label="Stacked bar chart of daily revenue by category">
        </canvas>
        <p *ngIf="!loading() && !chartData.datasets.length"
           class="py-10 text-center text-sm text-gray-400 dark:text-gray-500">
          No data for selected range.
        </p>
      </section>
    </main>
  `,
})
export class DashboardComponent implements OnInit {
  private readonly svc = inject(AggregatesService);
  private readonly fb = inject(FormBuilder);

  readonly inputCls = INPUT_CLS;
  readonly loading = signal(false);
  readonly showOthers = signal(false);
  readonly hasOthers = signal(false);

  private readonly aggData = signal<DailyAggregate[]>([]);
  private readonly rawTotal = signal(0);

  private cachedLabels: string[] = [];
  private cachedTopDatasets: any[] = [];
  private cachedOthersDataset: any = null;

  readonly rangeForm = this.fb.group({
    from: [this.defaultFrom()],
    to: [this.defaultTo()],
  });

  readonly totalOrders = computed(() => this.rawTotal().toLocaleString());
  readonly totalRevenue = computed(() => {
    const rev = this.aggData().reduce((s, d) => s + d.totals.totalRevenue, 0);
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(rev);
  });
  readonly avgOrderValue = computed(() => {
    const total = this.rawTotal();
    if (!total) return '—';
    const rev = this.aggData().reduce((s, d) => s + d.totals.totalRevenue, 0);
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(rev / total);
  });
  readonly daysInRange = computed(() => String(this.aggData().length));

  chartData: ChartConfiguration<'bar'>['data'] = { labels: [], datasets: [] };
  chartOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    plugins: { legend: { position: 'bottom' }, tooltip: { mode: 'index' } },
    scales: { x: { stacked: true }, y: { stacked: true, ticks: { callback: (v) => `$${Number(v) / 1000}K` } } },
  };

  ngOnInit(): void { this.load(); }

  load(): void {
    const { from, to } = this.rangeForm.value;
    if (!from || !to) return;
    this.loading.set(true);
    this.svc.get(from, to).subscribe({
      next: (res) => {
        this.aggData.set(res.data ?? []);
        this.rawTotal.set(res.totalOrders ?? 0);
        this.buildChart(res.data ?? []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  toggleOthers(): void {
    this.showOthers.update((v) => !v);
    this.rebuildChartData();
  }

  private buildChart(data: DailyAggregate[]): void {
    const totals = new Map<string, number>();
    for (const day of data) {
      for (const [cat, c] of Object.entries(day.categories)) {
        totals.set(cat, (totals.get(cat) ?? 0) + (c.totalRevenue ?? 0));
      }
    }

    const sorted = [...totals.entries()].sort((a, b) => b[1] - a[1]);
    const topCats = sorted.slice(0, TOP_N).map(([cat]) => cat);
    const topSet = new Set(topCats);
    const hasOthers = sorted.length > TOP_N;

    this.hasOthers.set(hasOthers);
    this.cachedLabels = data.map((d) => d.date);

    this.cachedTopDatasets = topCats.map((cat, i) => ({
      label: cat,
      data: data.map((d) => d.categories[cat]?.totalRevenue ?? 0),
      backgroundColor: PALETTE[i % PALETTE.length],
    }));

    this.cachedOthersDataset = hasOthers ? {
      label: OTHER_KEY,
      data: data.map((d) =>
        Object.entries(d.categories)
          .filter(([cat]) => !topSet.has(cat))
          .reduce((s, [, c]) => s + (c.totalRevenue ?? 0), 0)
      ),
      backgroundColor: OTHER_COLOR,
    } : null;

    this.rebuildChartData();
  }

  private rebuildChartData(): void {
    const datasets = [...this.cachedTopDatasets];
    if (this.cachedOthersDataset && this.showOthers()) {
      datasets.push(this.cachedOthersDataset);
    }
    this.chartData = { labels: this.cachedLabels, datasets };
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
