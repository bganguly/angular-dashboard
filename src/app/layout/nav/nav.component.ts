import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { ThemeToggleComponent } from '@angular-dashboard/ui';

@Component({
  selector: 'app-nav',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, ThemeToggleComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a
      href="https://bganguly.github.io/#angular_dashboard"
      (click)="goToPortfolio($event)"
      class="fixed top-1 left-3 z-50 inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium no-underline transition-colors text-zinc-300 hover:text-white"
      style="background:rgba(0,0,0,0.65);border:1px solid rgba(255,255,255,0.12)"
    >← Portfolio</a>
    <header class="border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <div class="flex w-full items-center justify-between px-5 py-3">
        <div class="flex items-center gap-6">
          <a routerLink="/" class="text-lg font-bold tracking-tight text-gray-900 dark:text-white">
            Order Dashboard
          </a>
          <nav class="hidden items-center gap-4 md:flex" role="navigation" aria-label="Main navigation">
            <a routerLink="/dashboard" routerLinkActive="!text-indigo-600 font-medium"
               class="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 transition-colors"
               [routerLinkActiveOptions]="{ exact: false }">
              Dashboard
            </a>
            <a routerLink="/orders" routerLinkActive="!text-indigo-600 font-medium"
               class="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 transition-colors"
               [routerLinkActiveOptions]="{ exact: false }">
              Orders
            </a>
            <a routerLink="/customers" routerLinkActive="!text-indigo-600 font-medium"
               class="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 transition-colors"
               [routerLinkActiveOptions]="{ exact: false }">
              Customers
            </a>
          </nav>
        </div>
        <div class="flex items-center gap-3">
          <app-theme-toggle />
          <button type="button"
                  class="md:hidden rounded-md p-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  (click)="mobileOpen.set(!mobileOpen())"
                  [attr.aria-expanded]="mobileOpen()"
                  aria-label="Toggle navigation">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                 stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5">
              <path d="M4 6h16M4 12h16M4 18h16"/>
            </svg>
          </button>
        </div>
      </div>
      @if (mobileOpen()) {
        <div class="border-t border-gray-200 px-5 py-3 md:hidden dark:border-gray-800">
          <nav class="flex flex-col gap-3" role="navigation" aria-label="Mobile navigation">
            <a routerLink="/dashboard" routerLinkActive="!text-indigo-600 font-medium"
               class="text-sm text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
               [routerLinkActiveOptions]="{ exact: false }"
               (click)="mobileOpen.set(false)">Dashboard</a>
            <a routerLink="/orders" routerLinkActive="!text-indigo-600 font-medium"
               class="text-sm text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
               [routerLinkActiveOptions]="{ exact: false }"
               (click)="mobileOpen.set(false)">Orders</a>
            <a routerLink="/customers" routerLinkActive="!text-indigo-600 font-medium"
               class="text-sm text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
               [routerLinkActiveOptions]="{ exact: false }"
               (click)="mobileOpen.set(false)">Customers</a>
          </nav>
        </div>
      }
    </header>
  `,
})
export class NavComponent {
  readonly mobileOpen = signal(false);

  goToPortfolio(e: MouseEvent) {
    e.preventDefault();
    const url = 'https://bganguly.github.io/#angular_dashboard';
    try { if (window.opener && !window.opener.closed) { window.opener.location.href = url; window.close(); return; } } catch (_) {}
    window.location.href = url;
  }
}
