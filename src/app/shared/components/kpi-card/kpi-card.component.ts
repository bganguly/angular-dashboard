import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-kpi-card',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900"
             [attr.aria-label]="label">
      <p class="text-sm text-gray-500 dark:text-gray-400 mb-1">{{ label }}</p>
      <p class="text-2xl font-semibold text-gray-900 dark:text-gray-50">{{ value }}</p>
      <p *ngIf="sub" class="text-sm text-gray-500 dark:text-gray-400 mt-1">{{ sub }}</p>
    </article>
  `,
})
export class KpiCardComponent {
  @Input({ required: true }) label!: string;
  @Input({ required: true }) value!: string;
  @Input() sub?: string;
}
