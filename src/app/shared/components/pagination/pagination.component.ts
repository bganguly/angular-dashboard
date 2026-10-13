import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

type PageItem = number | 'ellipsis-left' | 'ellipsis-right';

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
                  class="flex h-9 items-center rounded-md border border-gray-300 px-3 text-sm text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                  [disabled]="page <= 1 || loading"
                  (click)="go(page - 1)"
                  aria-label="Previous page">
            Prev
          </button>
        </li>
        <ng-container *ngFor="let item of pageItems">
          <li *ngIf="item === 'ellipsis-left' || item === 'ellipsis-right'"
              aria-hidden="true"
              class="px-2 text-sm text-gray-400">…</li>
          <li *ngIf="item !== 'ellipsis-left' && item !== 'ellipsis-right'"
              [attr.aria-current]="item === page ? 'page' : null">
            <button type="button"
                    [class]="item === page
                      ? 'flex h-9 min-w-9 items-center justify-center rounded-md px-3 text-sm bg-indigo-600 text-white'
                      : 'flex h-9 min-w-9 items-center justify-center rounded-md px-3 text-sm border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800'"
                    [disabled]="loading"
                    (click)="go(+item)"
                    [attr.aria-label]="'Page ' + item">
              {{ item }}
            </button>
          </li>
        </ng-container>
        <li>
          <button type="button"
                  class="flex h-9 items-center rounded-md border border-gray-300 px-3 text-sm text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                  [disabled]="page >= totalPages || loading"
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
  @Input() loading = false;
  @Output() pageChange = new EventEmitter<number>();

  get pageItems(): PageItem[] {
    const delta = 2;
    const items: PageItem[] = [];
    const left = Math.max(2, this.page - delta);
    const right = Math.min(this.totalPages - 1, this.page + delta);

    items.push(1);
    if (left > 2) items.push('ellipsis-left');
    for (let p = left; p <= right; p++) items.push(p);
    if (right < this.totalPages - 1) items.push('ellipsis-right');
    if (this.totalPages > 1) items.push(this.totalPages);

    return items;
  }

  go(p: number): void {
    if (p >= 1 && p <= this.totalPages && p !== this.page) {
      this.pageChange.emit(p);
    }
  }
}
