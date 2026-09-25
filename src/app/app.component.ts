import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavComponent } from './layout/nav/nav.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavComponent],
  template: `
    <div class="min-h-screen bg-zinc-50 font-sans dark:bg-black">
      <app-nav />
      <router-outlet />
    </div>
  `,
})
export class AppComponent {}
