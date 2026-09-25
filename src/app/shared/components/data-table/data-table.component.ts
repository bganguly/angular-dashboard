import {
  Component, Input, Output, EventEmitter,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';

export interface TableColumn<T> {
  key: keyof T | string;
  label: string;
  sortable?: boolean;
  class?: string;
}

function cn(...classes: (string | false | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

@Component({
  selector: 'app-data-table',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="overflow-x-auto">
      <table class="w-full border-collapse text-sm" role="grid" [attr.aria-rowcount]="rows.length">
        <caption *ngIf="caption" class="sr-only">{{ caption }}</caption>
        <thead>
          <tr class="border-b border-gray-200 text-left dark:border-gray-800">
            <th *ngFor="let col of columns" scope="col"
                [class]="thClass(col)"
                [attr.aria-sort]="col.sortable ? ariaSortFor(col) : null"
                (click)="col.sortable && onSort(col)">
              <span class="inline-flex items-center gap-1">
                {{ col.label }}
                <span *ngIf="col.sortable" aria-hidden="true"
                      [class]="sortKey === col.key ? 'text-xs text-indigo-500' : 'text-xs text-transparent'">
                  {{ sortKey === col.key ? (sortDir === 'asc' ? '▲' : '▼') : '▲' }}
                </span>
              </span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr *ngIf="loading">
            <td [attr.colspan]="columns.length" class="py-10 text-center">
              <span class="inline-block h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-indigo-500 dark:border-gray-700 dark:border-t-indigo-400"
                    role="status" aria-label="Loading"></span>
            </td>
          </tr>
          <tr *ngIf="!loading && rows.length === 0">
            <td [attr.colspan]="columns.length"
                class="py-12 text-center text-sm text-gray-400 dark:text-gray-500">
              No results found.
            </td>
          </tr>
          <ng-container *ngIf="!loading">
            <ng-content></ng-content>
          </ng-container>
        </tbody>
      </table>
    </div>
  `,
})
export class DataTableComponent {
  @Input({ required: true }) columns!: TableColumn<any>[];
  @Input() rows: any[] = [];
  @Input() loading = false;
  @Input() caption?: string;
  @Input() sortKey?: string;
  @Input() sortDir?: 'asc' | 'desc';
  @Output() sortChange = new EventEmitter<{ key: string; dir: 'asc' | 'desc' }>();

  thClass(col: TableColumn<any>): string {
    return cn(
      'px-3 py-2 font-medium text-gray-500 dark:text-gray-400',
      col.sortable && 'cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-200',
      col.class,
    );
  }

  onSort(col: TableColumn<any>): void {
    const newDir: 'asc' | 'desc' =
      this.sortKey === col.key && this.sortDir === 'desc' ? 'asc' : 'desc';
    this.sortChange.emit({ key: col.key as string, dir: newDir });
  }

  ariaSortFor(col: TableColumn<any>): string {
    if (this.sortKey !== col.key) return 'none';
    return this.sortDir === 'asc' ? 'ascending' : 'descending';
  }
}
