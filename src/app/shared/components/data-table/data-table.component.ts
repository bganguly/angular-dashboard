import {
  Component, Input, Output, EventEmitter,
  ChangeDetectionStrategy, ContentChildren, QueryList, AfterContentInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';

export interface TableColumn<T> {
  key: keyof T | string;
  label: string;
  sortable?: boolean;
  class?: string;
}

@Component({
  selector: 'app-data-table',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="table-responsive">
      <table class="table table-hover table-sm align-middle mb-0" role="grid" [attr.aria-rowcount]="rows.length">
        <caption *ngIf="caption" class="visually-hidden">{{ caption }}</caption>
        <thead class="table-light">
          <tr>
            <th *ngFor="let col of columns" scope="col"
                [class]="col.class ?? ''"
                [class.sortable-col]="col.sortable"
                [attr.aria-sort]="col.sortable ? ariaSortFor(col) : null"
                (click)="col.sortable && onSort(col)">
              {{ col.label }}
              <span *ngIf="col.sortable" class="sort-icon ms-1" aria-hidden="true">
                {{ sortKey === col.key ? (sortDir === 'asc' ? '↑' : '↓') : '⇅' }}
              </span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr *ngIf="loading">
            <td [attr.colspan]="columns.length" class="text-center py-4">
              <div class="spinner-border spinner-border-sm text-primary" role="status">
                <span class="visually-hidden">Loading…</span>
              </div>
            </td>
          </tr>
          <tr *ngIf="!loading && rows.length === 0">
            <td [attr.colspan]="columns.length" class="text-center text-muted py-4">No results found.</td>
          </tr>
          <ng-container *ngIf="!loading">
            <ng-content></ng-content>
          </ng-container>
        </tbody>
      </table>
    </div>
  `,
  styles: [`
    .sortable-col { cursor: pointer; user-select: none; }
    .sortable-col:hover { background: var(--bs-table-hover-bg); }
  `],
})
export class DataTableComponent {
  @Input({ required: true }) columns!: TableColumn<any>[];
  @Input() rows: any[] = [];
  @Input() loading = false;
  @Input() caption?: string;
  @Input() sortKey?: string;
  @Input() sortDir?: 'asc' | 'desc';
  @Output() sortChange = new EventEmitter<{ key: string; dir: 'asc' | 'desc' }>();

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
