import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav aria-label="Table pagination" *ngIf="totalPages > 1">
      <ul class="flex items-center gap-1">
        <li>
          <button type="button"
                  class="flex h-9 items-center rounded-md border border-gray-300 px-3 text-sm hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:hover:bg-gray-800"
                  [disabled]="page <= 1"
                  (click)="go(page - 1)"
                  aria-label="Previous page">
            Prev
          </button>
        </li>
        <li *ngFor="let p of pages"
            [attr.aria-current]="p === page ? 'page' : null">
          <button type="button"
                  [class]="p === page
                    ? 'flex h-9 min-w-9 items-center justify-center rounded-md px-3 text-sm bg-indigo-600 text-white'
                    : 'flex h-9 min-w-9 items-center justify-center rounded-md px-3 text-sm border border-gray-300 hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800'"
                  (click)="go(p)"
                  [attr.aria-label]="'Page ' + p">
            {{ p }}
          </button>
        </li>
        <li>
          <button type="button"
                  class="flex h-9 items-center rounded-md border border-gray-300 px-3 text-sm hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:hover:bg-gray-800"
                  [disabled]="page >= totalPages"
                  (click)="go(page + 1)"
                  aria-label="Next page">
            Next
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
