import { Component, inject } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { NavComponent } from './layout/nav/nav.component';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavComponent],
  template: `
    <div class="min-h-screen bg-zinc-50 font-sans dark:bg-black">
      @if (!isExplorer()) {
        <app-nav />
      }
      <router-outlet />
    </div>
  `,
})
export class AppComponent {
  private router = inject(Router);
  isExplorer = toSignal(
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      map(() => this.router.url.startsWith('/api-explorer')),
      startWith(typeof window !== 'undefined' && window.location.pathname.startsWith('/api-explorer')),
    ),
    { initialValue: typeof window !== 'undefined' && window.location.pathname.startsWith('/api-explorer') },
  );
}
