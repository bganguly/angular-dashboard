import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OrderStatus } from '../../../core/models';

const STATUS_CLASS: Record<OrderStatus, string> = {
  PENDING:    'bg-warning text-dark',
  CONFIRMED:  'bg-primary',
  PROCESSING: 'bg-info text-dark',
  SHIPPED:    'bg-secondary',
  DELIVERED:  'bg-success',
  CANCELLED:  'bg-danger',
  REFUNDED:   'bg-dark',
};

@Component({
  selector: 'app-status-badge',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="badge {{ badgeClass }}" [attr.aria-label]="'Status: ' + status">
      {{ status }}
    </span>
  `,
})
export class StatusBadgeComponent {
  @Input({ required: true }) status!: OrderStatus;

  get badgeClass(): string {
    return STATUS_CLASS[this.status] ?? 'bg-secondary';
  }
}
