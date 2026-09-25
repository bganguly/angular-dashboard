import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { BaseChartDirective } from 'ng2-charts';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { AggregatesService } from '../../core/services/aggregates.service';
import { KpiCardComponent } from '../../shared/components/kpi-card/kpi-card.component';
import { DailyAggregate } from '../../core/models';

Chart.register(...registerables);

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, BaseChartDirective, KpiCardComponent, CurrencyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main id="main-content" class="container-fluid py-4" aria-label="Dashboard overview">
      <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
        <h1 class="h4 mb-0 fw-semibold">Overview</h1>
        <form [formGroup]="rangeForm" class="d-flex gap-2 align-items-center" role="search"
              aria-label="Date range filter">
          <label for="dateFrom" class="visually-hidden">From date</label>
          <input id="dateFrom" type="date" class="form-control form-control-sm"
                 formControlName="from" (change)="load()" aria-label="From date" />
          <span aria-hidden="true">—</span>
          <label for="dateTo" class="visually-hidden">To date</label>
          <input id="dateTo" type="date" class="form-control form-control-sm"
                 formControlName="to" (change)="load()" aria-label="To date" />
        </form>
      </div>

      <div class="row g-3 mb-4" role="region" aria-label="Key performance indicators">
        <div class="col-6 col-md-3">
          <app-kpi-card label="Total Orders" [value]="totalOrders()" />
        </div>
        <div class="col-6 col-md-3">
          <app-kpi-card label="Total Revenue" [value]="totalRevenue()" />
        </div>
        <div class="col-6 col-md-3">
          <app-kpi-card label="Avg Order Value" [value]="avgOrderValue()" />
        </div>
        <div class="col-6 col-md-3">
          <app-kpi-card label="Days in Range" [value]="daysInRange()" />
        </div>
      </div>

      <section class="card border-0 shadow-sm" aria-label="Daily revenue by category">
        <div class="card-header bg-white border-bottom-0 pt-3">
          <h2 class="h6 mb-0 fw-semibold">Daily Revenue by Category</h2>
        </div>
        <div class="card-body" aria-busy="loading()">
          <div *ngIf="loading()" class="d-flex justify-content-center py-5" aria-live="polite">
            <div class="spinner-border text-primary" role="status">
              <span class="visually-hidden">Loading chart data…</span>
            </div>
          </div>
          <canvas *ngIf="!loading() && chartData.datasets.length"
                  baseChart
                  [data]="chartData"
                  [options]="chartOptions"
                  type="bar"
                  role="img"
                  aria-label="Stacked bar chart of daily revenue by category">
          </canvas>
          <p *ngIf="!loading() && !chartData.datasets.length" class="text-muted text-center py-4">
            No data for selected range.
          </p>
        </div>
      </section>
    </main>
  `,
})
export class DashboardComponent implements OnInit {
  private readonly svc = inject(AggregatesService);
  private readonly fb = inject(FormBuilder);

  readonly loading = signal(false);
  private readonly aggData = signal<DailyAggregate[]>([]);
  private readonly rawTotal = signal(0);

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

  private buildChart(data: DailyAggregate[]): void {
    const labels = data.map((d) => d.date);
    const cats = [...new Set(data.flatMap((d) => Object.keys(d.categories)))];
    const palette = ['#0d6efd','#6f42c1','#198754','#fd7e14','#dc3545','#0dcaf0','#ffc107'];
    const datasets = cats.map((cat, i) => ({
      label: cat,
      data: data.map((d) => d.categories[cat]?.totalRevenue ?? 0),
      backgroundColor: palette[i % palette.length],
    }));
    this.chartData = { labels, datasets };
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
