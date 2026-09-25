import { Component, ChangeDetectionStrategy, OnInit, OnDestroy, signal } from '@angular/core';

type Theme = 'light' | 'dark' | 'system';

@Component({
  selector: 'app-theme-toggle',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div role="group" aria-label="Theme"
         class="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-1 dark:border-gray-700 dark:bg-gray-900">
      <button type="button" (click)="select('light')"
              [class]="btnClass('light')" title="Light" aria-label="Light">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
             stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4">
          <circle cx="12" cy="12" r="4"/>
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>
        </svg>
      </button>
      <button type="button" (click)="select('dark')"
              [class]="btnClass('dark')" title="Dark" aria-label="Dark">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
             stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        </svg>
      </button>
      <button type="button" (click)="select('system')"
              [class]="btnClass('system')" title="System" aria-label="System">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
             stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4">
          <rect x="2" y="3" width="20" height="14" rx="2"/>
          <path d="M8 21h8M12 17v4"/>
        </svg>
      </button>
    </div>
  `,
})
export class ThemeToggleComponent implements OnInit, OnDestroy {
  readonly theme = signal<Theme>('system');
  private readonly mq = window.matchMedia('(prefers-color-scheme: dark)');
  private readonly mqHandler = () => { if (this.theme() === 'system') this.apply('system'); };

  ngOnInit(): void {
    const stored = localStorage.getItem('theme') as Theme | null;
    this.theme.set(stored ?? 'system');
    this.apply(this.theme());
    this.mq.addEventListener('change', this.mqHandler);
  }

  ngOnDestroy(): void {
    this.mq.removeEventListener('change', this.mqHandler);
  }

  select(t: Theme): void {
    this.theme.set(t);
    localStorage.setItem('theme', t);
    this.apply(t);
  }

  btnClass(value: string): string {
    return this.theme() === value
      ? 'flex h-7 w-7 items-center justify-center rounded-md bg-indigo-600 text-white transition-colors'
      : 'flex h-7 w-7 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100';
  }

  private apply(t: Theme): void {
    document.documentElement.classList.toggle('dark', t === 'dark' || (t === 'system' && this.mq.matches));
  }
}
