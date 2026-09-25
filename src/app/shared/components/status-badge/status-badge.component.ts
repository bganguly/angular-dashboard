import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { OrderStatus } from '@angular-dashboard/data-access';

const STATUS_CLASSES: Record<OrderStatus, string> = {
  PENDING:    'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  CONFIRMED:  'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300',
  PROCESSING: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300',
  SHIPPED:    'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  DELIVERED:  'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300',
  CANCELLED:  'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
  REFUNDED:   'bg-gray-800 text-gray-100 dark:bg-gray-700 dark:text-gray-300',
};

@Component({
  selector: 'app-status-badge',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium {{ badgeClass }}"
          [attr.aria-label]="'Status: ' + status">
      {{ status }}
    </span>
  `,
})
export class StatusBadgeComponent {
  @Input({ required: true }) status!: OrderStatus;

  get badgeClass(): string {
    return STATUS_CLASSES[this.status] ?? 'bg-gray-100 text-gray-700';
  }
}
