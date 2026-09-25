import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-kpi-card',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="card h-100 border-0 shadow-sm" [attr.aria-label]="label">
      <div class="card-body">
        <p class="card-text text-muted small mb-1">{{ label }}</p>
        <p class="card-title h4 mb-0 fw-semibold">{{ value }}</p>
        <p *ngIf="sub" class="small text-muted mt-1 mb-0">{{ sub }}</p>
      </div>
    </article>
  `,
})
export class KpiCardComponent {
  @Input({ required: true }) label!: string;
  @Input({ required: true }) value!: string;
  @Input() sub?: string;
}
