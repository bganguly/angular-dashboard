import {
  Component, OnInit, OnDestroy, inject, ChangeDetectionStrategy, ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { environment } from '../../../environments/environment';

const SLOW_WAKING_MS = 800;
const READY_DISMISS_MS = 1200;

type WakeStatus = 'waking' | 'ready' | null;

interface CardState {
  loading: boolean;
  slow: boolean;
  result: { json: unknown; ms: number } | null;
  err: string | null;
}

function emptyCard(): CardState {
  return { loading: false, slow: false, result: null, err: null };
}

const win = window as unknown as Record<string, unknown>;

function maybeAsleep(): boolean {
  return !win['_apiLastOk'];
}

async function fetchTimed(url: string): Promise<{ json: unknown; ms: number }> {
  const t0 = performance.now();
  const r = await fetch(url);
  const json = await r.json();
  const ms = Math.round(performance.now() - t0);
  win['_apiLastOk'] = true;
  return { json, ms };
}

@Component({
  selector: 'app-api-explorer',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  changeDetection: ChangeDetectionStrategy.Default,
  template: `
    <div style="background:#0f0f13;color:#f4f4f5;min-height:100vh;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;-webkit-font-smoothing:antialiased">
      <style>
        @keyframes spin { to { transform: rotate(360deg); } }
        .ae-spinner { display:inline-block;width:12px;height:12px;border:2px solid rgba(255,255,255,0.15);border-top-color:#a1a1aa;border-radius:50%;animation:spin 0.6s linear infinite;flex-shrink:0 }
        .ae-input { background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.10);color:#e4e4e7;border-radius:0.5rem;padding:0.375rem 0.75rem;font-size:0.8rem;font-family:monospace;outline:none }
        .ae-date  { background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.10);color:#e4e4e7;border-radius:0.5rem;padding:0.375rem 0.5rem;font-size:0.75rem;font-family:monospace;outline:none;color-scheme:dark }
        .ae-run   { display:inline-flex;align-items:center;gap:0.375rem;padding:0.375rem 1rem;border-radius:0.5rem;background:rgba(99,102,241,0.18);border:1px solid rgba(99,102,241,0.4);color:#a5b4fc;font-size:0.75rem;font-weight:600;cursor:pointer;white-space:nowrap;font-family:inherit }
        .ae-run:disabled { opacity:0.5;cursor:not-allowed }
        .ae-section { border:1px solid rgba(255,255,255,0.07);border-radius:0.75rem;margin-bottom:0.625rem;background:rgba(255,255,255,0.02);overflow:hidden }
        .ae-hd    { display:flex;align-items:center;gap:0.75rem;padding:0.875rem 1.25rem;cursor:pointer;user-select:none }
        .ae-hd:hover { background:rgba(255,255,255,0.02) }
        .ae-get   { font-size:0.6875rem;font-weight:700;font-family:monospace;padding:0.2rem 0.5rem;border-radius:0.375rem;background:rgba(34,197,94,0.15);border:1px solid rgba(34,197,94,0.25);color:#4ade80;letter-spacing:.02em;flex-shrink:0 }
        .ae-path  { font-family:monospace;font-size:0.8125rem;color:#e4e4e7;font-weight:500 }
        .ae-sub   { font-size:0.75rem;color:#52525b }
        .ae-chev  { margin-left:auto;color:#52525b;flex-shrink:0;transition:transform 0.18s }
        .ae-body  { padding:0 1.25rem 1.25rem;border-top:1px solid rgba(255,255,255,0.05) }
        .ae-ctrl  { display:flex;align-items:flex-start;gap:0.75rem;padding-top:1rem;margin-bottom:0.75rem }
        .ae-params{ display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap;flex:1 }
        .ae-param { font-size:0.6875rem;font-family:monospace;padding:0.125rem 0.5rem;border-radius:0.375rem;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);color:#a1a1aa }
        .ae-meta  { font-size:0.6875rem;color:#71717a;margin-bottom:0.625rem }
        .ae-err   { font-size:0.75rem;color:#f87171;margin-top:0.5rem }
        .ae-raw   { background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:0.5rem;padding:0.75rem;font-family:monospace;font-size:0.6875rem;color:#a1a1aa;white-space:pre-wrap;overflow-x:auto;max-height:260px;overflow-y:auto;margin-top:0.5rem }
        .ae-tbl   { width:100%;border-collapse:collapse;font-size:0.6875rem;margin-top:0.5rem }
        .ae-tbl th { text-align:left;padding:0.25rem 0.625rem;color:#52525b;font-weight:600;letter-spacing:.06em;text-transform:uppercase;font-size:0.6rem;border-bottom:1px solid rgba(255,255,255,0.06) }
        .ae-tbl td { padding:0.25rem 0.625rem;color:#a1a1aa;border-bottom:1px solid rgba(255,255,255,0.04);font-family:monospace }
        .ae-ms     { display:inline-block;font-size:0.6875rem;font-family:monospace;padding:0.15rem 0.5rem;border-radius:0.375rem;background:rgba(251,191,36,0.12);border:1px solid rgba(251,191,36,0.25);color:#fbbf24;letter-spacing:.02em;margin-bottom:0.4rem }
        .ae-ms-fast{ background:rgba(34,197,94,0.12);border-color:rgba(34,197,94,0.25);color:#4ade80 }
        .ae-ms-slow{ background:rgba(239,68,68,0.12);border-color:rgba(239,68,68,0.25);color:#f87171 }
        .ae-raw-tog { display:inline-block;font-size:0.6875rem;padding:0.2rem 0.625rem;border-radius:0.375rem;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.10);color:#71717a;cursor:pointer;margin-top:0.625rem;font-family:inherit;line-height:1.4 }
        .ae-raw-tog:hover { color:#a1a1aa }
      </style>

      <!-- Nav -->
      <nav style="position:fixed;top:0;left:0;right:0;z-index:40;border-bottom:1px solid rgba(255,255,255,0.06);background:rgba(15,15,19,0.90);backdrop-filter:blur(16px)">
        <div style="max-width:64rem;margin:0 auto;padding:0 1.5rem;height:3.5rem;display:flex;align-items:center;justify-content:space-between">
          <a href="https://bganguly.github.io/#angular_dashboard"
             (click)="goPortfolio($event)"
             style="display:flex;align-items:center;gap:0.5rem;color:#71717a;text-decoration:none;font-size:0.875rem">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19 12H5M5 12l7-7M5 12l7 7"/>
            </svg>
            Portfolio
          </a>
          <div style="display:flex;align-items:center;gap:0.75rem">
            @if (wakeStatus === 'waking') {
              <div style="display:flex;align-items:center;gap:0.5rem;background:rgba(251,191,36,0.12);border:1px solid rgba(251,191,36,0.30);color:#fbbf24;border-radius:0.5rem;padding:0.375rem 0.75rem;font-size:0.75rem">
                <span class="ae-spinner"></span>
                Probing GET /api/orders —
                <span style="font-family:monospace;margin-left:4px">{{ (wakeMs / 1000).toFixed(1) }}s</span>
              </div>
            }
            @if (wakeStatus === 'ready') {
              <div style="display:flex;align-items:center;gap:0.5rem;background:rgba(34,197,94,0.12);border:1px solid rgba(34,197,94,0.30);color:#4ade80;border-radius:0.5rem;padding:0.375rem 0.75rem;font-size:0.75rem">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                Backend ready
              </div>
            }
            <span style="font-size:0.6875rem;padding:0.125rem 0.5rem;border-radius:9999px;background:rgba(99,102,241,0.12);border:1px solid rgba(99,102,241,0.3);color:#a5b4fc">
              Angular 19 · Spring Boot · GCP
            </span>
          </div>
        </div>
      </nav>

      <!-- Hero -->
      <div style="padding:7rem 1.5rem 2.5rem;max-width:64rem;margin:0 auto">
        <p style="font-size:0.75rem;font-weight:500;letter-spacing:.1em;text-transform:uppercase;color:#818cf8;margin-bottom:0.75rem">API Explorer</p>
        <h1 style="font-size:1.5rem;font-weight:700;color:#f4f4f5;margin-bottom:0.5rem">Angular 19 + Spring Boot</h1>
        <p style="font-size:0.875rem;color:#71717a;max-width:42rem">
          Live endpoints from the Spring Boot REST API backing this Angular dashboard — 4M+ orders dataset.
          First request may be slow if the Cloud Run instance has scaled to zero.
        </p>
      </div>

      <!-- Accordion -->
      <div style="padding:0 1.5rem 4rem;max-width:64rem;margin:0 auto">

        <!-- GET /api/orders -->
        <div class="ae-section">
          <div class="ae-hd" (click)="toggle('orders')">
            <span class="ae-get">GET</span>
            <span class="ae-path">/api/orders</span>
            <span class="ae-sub">Latest orders — paginated, sorted by date descending</span>
            <svg class="ae-chev" [style.transform]="expanded['orders'] ? 'rotate(180deg)' : 'rotate(0)'"
                 width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </div>
          @if (expanded['orders']) {
            <div class="ae-body">
              <div class="ae-ctrl">
                <div class="ae-params">
                  <span class="ae-param">pageSize=10</span>
                  <span class="ae-param">sort=placedAt</span>
                  <span class="ae-param">dir=desc</span>
                </div>
                <button class="ae-run" [disabled]="orders.loading" (click)="runOrders()">
                  @if (orders.loading) { <span class="ae-spinner"></span> Running… } @else { ▶ Run }
                </button>
              </div>
              @if (orders.loading && orders.slow) { <div style="display:flex;align-items:center;gap:0.5rem;font-size:0.6875rem;color:#71717a"><span class="ae-spinner"></span> Service may be waking up…</div> }
              @if (orders.err) { <div class="ae-err">{{ orders.err }}</div> }
              @if (orders.result && !orders.loading) {
                <span [class]="msClass(ordersMs)">{{ ordersMs }}ms</span>
                <div class="ae-meta">{{ ordersLabel }}</div>
                <table class="ae-tbl">
                  <tr><th>ID</th><th>Customer</th><th>Status</th><th>Region</th><th>Total</th><th>Placed</th></tr>
                  @for (r of ordersRows; track $index) {
                    <tr>
                      <td>{{ r['id'] }}</td>
                      <td>{{ $any(r['customer'])?.firstName ? ($any(r['customer'])?.firstName + ' ' + $any(r['customer'])?.lastName) : (r['customerName'] ?? r['customer_name'] ?? '—') }}</td>
                      <td>{{ r['status'] }}</td>
                      <td>{{ $any(r['region'])?.name ?? $any(r['region'])?.code ?? r['region'] ?? '—' }}</td>
                      <td>{{ $any(r['totalAmount'] ?? r['total']) | number:'1.2-2' }}</td>
                      <td>{{ $any(r['placedAt'] ?? r['placed_at'] ?? '') | slice:0:10 }}</td>
                    </tr>
                  }
                </table>
                <button class="ae-raw-tog" (click)="toggleRaw('orders')">{{ showRaw['orders'] ? '▲ Hide raw JSON' : '▼ View raw JSON' }}</button>
                @if (showRaw['orders']) { <pre class="ae-raw">{{ orders.result.json | json }}</pre> }
              }
            </div>
          }
        </div>

        <!-- GET /api/orders?q= -->
        <div class="ae-section">
          <div class="ae-hd" (click)="toggle('search')">
            <span class="ae-get">GET</span>
            <span class="ae-path">/api/orders?q=…</span>
            <span class="ae-sub">Full-text search via GIN pg_bigm index — 2-char minimum</span>
            <svg class="ae-chev" [style.transform]="expanded['search'] ? 'rotate(180deg)' : 'rotate(0)'"
                 width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </div>
          @if (expanded['search']) {
            <div class="ae-body">
              <div class="ae-ctrl">
                <div class="ae-params">
                  <input class="ae-input" [(ngModel)]="searchQ" placeholder="e.g. gupta, sara, east…"
                         (keydown.enter)="runSearch()" style="width:220px" />
                  <span class="ae-param">pageSize=10</span>
                </div>
                <button class="ae-run" [disabled]="search.loading" (click)="runSearch()">
                  @if (search.loading) { <span class="ae-spinner"></span> Running… } @else { ▶ Run }
                </button>
              </div>
              @if (search.loading && search.slow) { <div style="display:flex;align-items:center;gap:0.5rem;font-size:0.6875rem;color:#71717a"><span class="ae-spinner"></span> Service may be waking up…</div> }
              @if (search.err) { <div class="ae-err">{{ search.err }}</div> }
              @if (search.result && !search.loading) {
                <span [class]="msClass(searchMs)">{{ searchMs }}ms</span>
                <div class="ae-meta">{{ searchLabel }}</div>
                <table class="ae-tbl">
                  <tr><th>ID</th><th>Customer</th><th>Status</th><th>Region</th><th>Total</th><th>Placed</th></tr>
                  @for (r of searchRows; track $index) {
                    <tr>
                      <td>{{ r['id'] }}</td>
                      <td>{{ $any(r['customer'])?.firstName ? ($any(r['customer'])?.firstName + ' ' + $any(r['customer'])?.lastName) : (r['customerName'] ?? r['customer_name'] ?? '—') }}</td>
                      <td>{{ r['status'] }}</td>
                      <td>{{ $any(r['region'])?.name ?? $any(r['region'])?.code ?? r['region'] ?? '—' }}</td>
                      <td>{{ $any(r['totalAmount'] ?? r['total']) | number:'1.2-2' }}</td>
                      <td>{{ $any(r['placedAt'] ?? r['placed_at'] ?? '') | slice:0:10 }}</td>
                    </tr>
                  }
                </table>
                @if (searchRows.length === 0) { <p style="font-size:.75rem;color:#71717a">No results.</p> }
                <button class="ae-raw-tog" (click)="toggleRaw('search')">{{ showRaw['search'] ? '▲ Hide raw JSON' : '▼ View raw JSON' }}</button>
                @if (showRaw['search']) { <pre class="ae-raw">{{ search.result.json | json }}</pre> }
              }
            </div>
          }
        </div>

        <!-- GET /api/aggregates -->
        <div class="ae-section">
          <div class="ae-hd" (click)="toggle('agg')">
            <span class="ae-get">GET</span>
            <span class="ae-path">/api/aggregates</span>
            <span class="ae-sub">Pre-aggregated daily totals by category — millisecond response</span>
            <svg class="ae-chev" [style.transform]="expanded['agg'] ? 'rotate(180deg)' : 'rotate(0)'"
                 width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </div>
          @if (expanded['agg']) {
            <div class="ae-body">
              <div class="ae-ctrl">
                <div class="ae-params">
                  <span style="font-size:0.6875rem;font-family:monospace;color:#52525b">from</span>
                  <input type="date" class="ae-date" [(ngModel)]="aggFrom" placeholder="from" style="width:150px" />
                  <span style="font-size:0.6875rem;font-family:monospace;color:#52525b">to</span>
                  <input type="date" class="ae-date" [(ngModel)]="aggTo" placeholder="to" style="width:150px" />
                  <span class="ae-param">topCategories=3</span>
                </div>
                <button class="ae-run" [disabled]="agg.loading || !aggFrom || !aggTo" (click)="runAgg()">
                  @if (agg.loading) { <span class="ae-spinner"></span> Running… } @else { ▶ Run }
                </button>
              </div>
              @if (agg.loading && agg.slow) { <div style="display:flex;align-items:center;gap:0.5rem;font-size:0.6875rem;color:#71717a"><span class="ae-spinner"></span> Service may be waking up…</div> }
              @if (agg.err) { <div class="ae-err">{{ agg.err }}</div> }
              @if (agg.result && !agg.loading) {
                <span [class]="msClass(aggMs)">{{ aggMs }}ms</span>
                <div class="ae-meta">{{ aggRows.length }} day{{ aggRows.length !== 1 ? 's' : '' }} · {{ aggFrom }} → {{ aggTo }}</div>
                <div style="display:flex;gap:1rem;margin-bottom:0.75rem">
                  <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:0.5rem;padding:0.5rem 1rem;text-align:center">
                    <div style="font-size:1.125rem;font-weight:700;color:#f4f4f5">{{ aggOrders | number }}</div>
                    <div style="font-size:0.625rem;color:#52525b;text-transform:uppercase;letter-spacing:.06em">Total Orders</div>
                  </div>
                  <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:0.5rem;padding:0.5rem 1rem;text-align:center">
                    <div style="font-size:1.125rem;font-weight:700;color:#34d399">\${{ aggRevenue | number:'1.0-0' }}</div>
                    <div style="font-size:0.625rem;color:#52525b;text-transform:uppercase;letter-spacing:.06em">Est. Revenue</div>
                  </div>
                </div>
                <table class="ae-tbl">
                  <tr><th>Date</th><th>Orders</th><th>Revenue</th><th>Categories</th></tr>
                  @for (row of aggTableRows; track $index) {
                    <tr>
                      <td>{{ row.date }}</td>
                      <td>{{ row.orders | number }}</td>
                      <td style="color:#34d399">\${{ row.revenue | number:'1.0-0' }}</td>
                      <td style="color:#71717a">{{ row.cats }}</td>
                    </tr>
                  }
                </table>
                <button class="ae-raw-tog" (click)="toggleRaw('agg')">{{ showRaw['agg'] ? '▲ Hide raw JSON' : '▼ View raw JSON' }}</button>
                @if (showRaw['agg']) { <pre class="ae-raw">{{ agg.result.json | json }}</pre> }
              }
            </div>
          }
        </div>

        <!-- GET /api/customers -->
        <div class="ae-section">
          <div class="ae-hd" (click)="toggle('cust')">
            <span class="ae-get">GET</span>
            <span class="ae-path">/api/customers</span>
            <span class="ae-sub">Customer list — cursor-paginated</span>
            <svg class="ae-chev" [style.transform]="expanded['cust'] ? 'rotate(180deg)' : 'rotate(0)'"
                 width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </div>
          @if (expanded['cust']) {
            <div class="ae-body">
              <div class="ae-ctrl">
                <div class="ae-params">
                  <input class="ae-input" [(ngModel)]="custQ" placeholder="e.g. gupta, sara…"
                         (keydown.enter)="runCustomers()" style="width:200px" />
                  <span class="ae-param">limit=10</span>
                </div>
                <button class="ae-run" [disabled]="cust.loading" (click)="runCustomers()">
                  @if (cust.loading) { <span class="ae-spinner"></span> Running… } @else { ▶ Run }
                </button>
              </div>
              @if (cust.loading && cust.slow) { <div style="display:flex;align-items:center;gap:0.5rem;font-size:0.6875rem;color:#71717a"><span class="ae-spinner"></span> Service may be waking up…</div> }
              @if (cust.err) { <div class="ae-err">{{ cust.err }}</div> }
              @if (cust.result && !cust.loading) {
                <span [class]="msClass(custMs)">{{ custMs }}ms</span>
                <div class="ae-meta">{{ custRows.length }} customer{{ custRows.length !== 1 ? 's' : '' }} returned</div>
                <table class="ae-tbl">
                  <tr><th>ID</th><th>Name</th><th>Email</th><th>Region</th></tr>
                  @for (r of custRows; track $index) {
                    <tr>
                      <td>{{ r['id'] }}</td>
                      <td>{{ r['name'] ?? r['customerName'] ?? '—' }}</td>
                      <td>{{ r['email'] ?? '—' }}</td>
                      <td>{{ r['region'] ?? '—' }}</td>
                    </tr>
                  }
                </table>
                @if (custRows.length === 0) { <p style="font-size:.75rem;color:#71717a">No results.</p> }
                <button class="ae-raw-tog" (click)="toggleRaw('cust')">{{ showRaw['cust'] ? '▲ Hide raw JSON' : '▼ View raw JSON' }}</button>
                @if (showRaw['cust']) { <pre class="ae-raw">{{ cust.result.json | json }}</pre> }
              }
            </div>
          }
        </div>

        <!-- GET /api/regions -->
        <div class="ae-section">
          <div class="ae-hd" (click)="toggle('regions')">
            <span class="ae-get">GET</span>
            <span class="ae-path">/api/regions</span>
            <span class="ae-sub">All regions — no parameters</span>
            <svg class="ae-chev" [style.transform]="expanded['regions'] ? 'rotate(180deg)' : 'rotate(0)'"
                 width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </div>
          @if (expanded['regions']) {
            <div class="ae-body">
              <div class="ae-ctrl">
                <div class="ae-params">
                  <p style="font-size:.6875rem;color:#52525b">Returns the full list of regions used for filtering.</p>
                </div>
                <button class="ae-run" [disabled]="regions.loading" (click)="runRegions()">
                  @if (regions.loading) { <span class="ae-spinner"></span> Running… } @else { ▶ Run }
                </button>
              </div>
              @if (regions.loading && regions.slow) { <div style="display:flex;align-items:center;gap:0.5rem;font-size:0.6875rem;color:#71717a"><span class="ae-spinner"></span> Service may be waking up…</div> }
              @if (regions.err) { <div class="ae-err">{{ regions.err }}</div> }
              @if (regions.result && !regions.loading) {
                <span [class]="msClass(regionsMs)">{{ regionsMs }}ms</span>
                <div class="ae-meta">{{ regionRows.length }} region{{ regionRows.length !== 1 ? 's' : '' }} returned</div>
                <div style="display:flex;flex-wrap:wrap;gap:0.375rem;margin-bottom:0.75rem">
                  @for (r of regionRows; track $index) {
                    <span style="font-size:0.6875rem;padding:0.2rem 0.6rem;border-radius:9999px;background:rgba(129,140,248,0.10);border:1px solid rgba(129,140,248,0.25);color:#a5b4fc">
                      {{ r['name'] ?? r['code'] ?? r['id'] ?? '—' }}
                    </span>
                  }
                </div>
                <button class="ae-raw-tog" (click)="toggleRaw('regions')">{{ showRaw['regions'] ? '▲ Hide raw JSON' : '▼ View raw JSON' }}</button>
                @if (showRaw['regions']) { <pre class="ae-raw">{{ regions.result.json | json }}</pre> }
              }
            </div>
          }
        </div>

      </div>
    </div>
  `,
})
export class ApiExplorerComponent implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private cdr  = inject(ChangeDetectorRef);

  wakeStatus: WakeStatus = null;
  wakeMs = 0;

  private wakeStart = 0;
  private slowTimer: ReturnType<typeof setTimeout> | null = null;
  private wakeInterval: ReturnType<typeof setInterval> | null = null;
  private readyTimer: ReturnType<typeof setTimeout> | null = null;

  // Card states
  orders  = emptyCard();
  search  = emptyCard();
  agg     = emptyCard();
  cust    = emptyCard();
  regions = emptyCard();

  expanded: Record<string, boolean> = {};
  toggle(key: string) { this.expanded[key] = !this.expanded[key]; }

  showRaw: Record<string, boolean> = {};
  toggleRaw(key: string) { this.showRaw[key] = !this.showRaw[key]; }

  msClass(ms: number) { return ms < 300 ? 'ae-ms ae-ms-fast' : ms < 1000 ? 'ae-ms' : 'ae-ms ae-ms-slow'; }

  get aggTableRows(): Array<{date:string;orders:number;revenue:number;cats:string}> {
    return this.aggRows.map(d => {
      const cats = (d['categories'] as Record<string,{totalOrders?:number;totalRevenue?:number}>) ?? {};
      let orders = 0, revenue = 0;
      Object.values(cats).forEach(c => { orders += c.totalOrders ?? 0; revenue += c.totalRevenue ?? 0; });
      const top = Object.entries(cats).sort((a,b)=>(b[1].totalOrders??0)-(a[1].totalOrders??0)).slice(0,3).map(([k])=>k).join(', ');
      return { date: String(d['date']??''), orders, revenue, cats: top };
    });
  }

  // Inputs
  searchQ = '';
  custQ   = '';
  aggFrom = new Date(Date.now() - 60 * 864e5).toISOString().slice(0, 10);
  aggTo   = new Date().toISOString().slice(0, 10);

  // Derived
  get ordersRows()  { return this.rows(this.orders.result?.json); }
  get ordersLabel() {
    const j = this.orders.result?.json as { total?: number } | null;
    const t = j?.total ?? this.ordersRows.length;
    return `${Number(t).toLocaleString()} total orders · showing first 10`;
  }
  get ordersMs()    { return this.orders.result?.ms ?? 0; }

  get searchRows()  { return this.rows(this.search.result?.json); }
  get searchLabel() {
    const j = this.search.result?.json as { total?: number } | null;
    const t = j?.total ?? this.searchRows.length;
    return `${Number(t).toLocaleString()} match${Number(t) !== 1 ? 'es' : ''} for "${this.searchQ}"`;
  }
  get searchMs()    { return this.search.result?.ms ?? 0; }

  get aggRows()     { const j = this.agg.result?.json; return (Array.isArray(j) ? j : (j as { data?: unknown[] })?.data ?? []) as Record<string, unknown>[]; }
  get aggOrders()   { let s = 0; this.aggRows.forEach(d => Object.values((d['categories'] as Record<string, { totalOrders?: number }>) || {}).forEach(c => s += c.totalOrders || 0)); return s; }
  get aggRevenue()  { let s = 0; this.aggRows.forEach(d => Object.values((d['categories'] as Record<string, { totalRevenue?: number }>) || {}).forEach(c => s += c.totalRevenue || 0)); return s; }
  get aggMs()       { return this.agg.result?.ms ?? 0; }

  get custRows()    { return this.rows(this.cust.result?.json); }
  get custMs()      { return this.cust.result?.ms ?? 0; }

  get regionRows()  { const j = this.regions.result?.json; return (Array.isArray(j) ? j : []) as Record<string, unknown>[]; }
  get regionsMs()   { return this.regions.result?.ms ?? 0; }

  private rows(json: unknown): Record<string, unknown>[] {
    if (!json) return [];
    const r = (json as { data?: unknown[] })?.data ?? (Array.isArray(json) ? json : []);
    return r as Record<string, unknown>[];
  }

  ngOnInit() {
    this.wakeStart = performance.now();
    this.slowTimer = setTimeout(() => {
      this.wakeStatus = 'waking';
      this.wakeMs = 0;
      this.wakeInterval = setInterval(() => {
        this.wakeMs = Math.round(performance.now() - this.wakeStart);
        this.cdr.markForCheck();
      }, 100);
    }, SLOW_WAKING_MS);

    this.http.get(`${environment.apiBase}/api/orders?pageSize=10&sort=placedAt&dir=desc`).subscribe({
      next: () => this.markReady(),
      error: () => this.markReady(),
    });
  }

  ngOnDestroy() {
    if (this.slowTimer)    clearTimeout(this.slowTimer);
    if (this.wakeInterval) clearInterval(this.wakeInterval);
    if (this.readyTimer)   clearTimeout(this.readyTimer);
  }

  private markReady() {
    if (this.slowTimer)    { clearTimeout(this.slowTimer);    this.slowTimer = null; }
    if (this.wakeInterval) { clearInterval(this.wakeInterval); this.wakeInterval = null; }
    if (this.wakeStatus === 'waking') {
      this.wakeStatus = 'ready';
      this.readyTimer = setTimeout(() => {
        if (this.wakeStatus === 'ready') this.wakeStatus = null;
      }, READY_DISMISS_MS);
    } else {
      this.wakeStatus = null;
    }
  }

  async runOrders() {
    this.orders = { loading: true, slow: maybeAsleep(), result: null, err: null };
    try {
      const r = await fetchTimed(`${environment.apiBase}/api/orders?pageSize=10&sort=placedAt&dir=desc`);
      this.orders = { loading: false, slow: false, result: r, err: null };
    } catch (e) {
      this.orders = { loading: false, slow: false, result: null, err: String(e) };
    }
  }

  async runSearch() {
    if (!this.searchQ.trim()) return;
    this.search = { loading: true, slow: maybeAsleep(), result: null, err: null };
    try {
      const r = await fetchTimed(`${environment.apiBase}/api/orders?q=` + encodeURIComponent(this.searchQ.trim()) + '&pageSize=10');
      this.search = { loading: false, slow: false, result: r, err: null };
    } catch (e) {
      this.search = { loading: false, slow: false, result: null, err: String(e) };
    }
  }

  async runAgg() {
    if (!this.aggFrom || !this.aggTo) return;
    this.agg = { loading: true, slow: maybeAsleep(), result: null, err: null };
    try {
      const r = await fetchTimed(`${environment.apiBase}/api/aggregates?from=${this.aggFrom}&to=${this.aggTo}&topCategories=3`);
      this.agg = { loading: false, slow: false, result: r, err: null };
    } catch (e) {
      this.agg = { loading: false, slow: false, result: null, err: String(e) };
    }
  }

  async runCustomers() {
    this.cust = { loading: true, slow: maybeAsleep(), result: null, err: null };
    try {
      const url = `${environment.apiBase}/api/customers?limit=10` + (this.custQ.trim() ? '&q=' + encodeURIComponent(this.custQ.trim()) : '');
      const r = await fetchTimed(url);
      this.cust = { loading: false, slow: false, result: r, err: null };
    } catch (e) {
      this.cust = { loading: false, slow: false, result: null, err: String(e) };
    }
  }

  async runRegions() {
    this.regions = { loading: true, slow: maybeAsleep(), result: null, err: null };
    try {
      const r = await fetchTimed(`${environment.apiBase}/api/regions`);
      this.regions = { loading: false, slow: false, result: r, err: null };
    } catch (e) {
      this.regions = { loading: false, slow: false, result: null, err: String(e) };
    }
  }

  goPortfolio(e: Event) {
    e.preventDefault();
    const url = 'https://bganguly.github.io/#angular_dashboard';
    try { if (window.opener && !(window.opener as Window).closed) { (window.opener as Window).location.href = url; window.close(); return; } } catch (_) {}
    window.location.href = url;
  }
}
