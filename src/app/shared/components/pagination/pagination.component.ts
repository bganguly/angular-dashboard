import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav aria-label="Table pagination" *ngIf="totalPages > 1">
      <ul class="pagination pagination-sm mb-0 flex-wrap">
        <li class="page-item" [class.disabled]="page <= 1">
          <button class="page-link" (click)="go(page - 1)" [attr.aria-disabled]="page <= 1" aria-label="Previous page">
            &laquo;
          </button>
        </li>

        <li *ngFor="let p of pages" class="page-item" [class.active]="p === page" [attr.aria-current]="p === page ? 'page' : null">
          <button class="page-link" (click)="go(p)" [attr.aria-label]="'Page ' + p">{{ p }}</button>
        </li>

        <li class="page-item" [class.disabled]="page >= totalPages">
          <button class="page-link" (click)="go(page + 1)" [attr.aria-disabled]="page >= totalPages" aria-label="Next page">
            &raquo;
          </button>
        </li>
      </ul>
    </nav>
  `,
})
export class PaginationComponent {
  @Input({ required: true }) page!: number;
  @Input({ required: true }) totalPages!: number;
  @Output() pageChange = new EventEmitter<number>();

  get pages(): number[] {
    const delta = 2;
    const left = Math.max(1, this.page - delta);
    const right = Math.min(this.totalPages, this.page + delta);
    return Array.from({ length: right - left + 1 }, (_, i) => left + i);
  }

  go(p: number): void {
    if (p >= 1 && p <= this.totalPages && p !== this.page) {
      this.pageChange.emit(p);
    }
  }
}
