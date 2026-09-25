import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  {
    path: 'dashboard',
    loadComponent: () => import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
    title: 'Dashboard',
  },
  {
    path: 'orders',
    loadComponent: () => import('./features/orders/orders.component').then((m) => m.OrdersComponent),
    title: 'Orders',
  },
  {
    path: 'customers',
    loadComponent: () => import('./features/customers/customers.component').then((m) => m.CustomersComponent),
    title: 'Customers',
  },
  { path: '**', redirectTo: 'dashboard' },
];
