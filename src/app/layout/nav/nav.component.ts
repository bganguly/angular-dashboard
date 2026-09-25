import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { NgbCollapseModule } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-nav',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, NgbCollapseModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header>
      <a class="visually-hidden-focusable" href="#main-content">Skip to main content</a>
      <nav class="navbar navbar-expand-md navbar-dark bg-primary" role="navigation" aria-label="Main navigation">
        <div class="container-fluid">
          <a class="navbar-brand fw-bold" routerLink="/" aria-label="Dashboard home">
            Order Dashboard
          </a>
          <button class="navbar-toggler" type="button"
                  (click)="collapsed = !collapsed"
                  [attr.aria-expanded]="!collapsed"
                  aria-controls="navbarNav"
                  aria-label="Toggle navigation">
            <span class="navbar-toggler-icon"></span>
          </button>
          <div class="navbar-collapse" id="navbarNav" [ngbCollapse]="collapsed">
            <ul class="navbar-nav ms-auto" role="list">
              <li class="nav-item" role="listitem">
                <a class="nav-link" routerLink="/dashboard" routerLinkActive="active"
                   [routerLinkActiveOptions]="{ exact: false }" aria-label="Dashboard">
                  Dashboard
                </a>
              </li>
              <li class="nav-item" role="listitem">
                <a class="nav-link" routerLink="/orders" routerLinkActive="active"
                   [routerLinkActiveOptions]="{ exact: false }" aria-label="Orders">
                  Orders
                </a>
              </li>
              <li class="nav-item" role="listitem">
                <a class="nav-link" routerLink="/customers" routerLinkActive="active"
                   [routerLinkActiveOptions]="{ exact: false }" aria-label="Customers">
                  Customers
                </a>
              </li>
            </ul>
          </div>
        </div>
      </nav>
    </header>
  `,
})
export class NavComponent {
  collapsed = true;
}
