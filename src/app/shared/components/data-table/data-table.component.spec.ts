import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DataTableComponent, TableColumn } from './data-table.component';

interface Row { id: number; name: string }

const COLS: TableColumn<Row>[] = [
  { key: 'id',   label: 'ID',   sortable: true },
  { key: 'name', label: 'Name', sortable: true },
];

describe('DataTableComponent', () => {
  let fixture: ComponentFixture<DataTableComponent>;
  let component: DataTableComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [DataTableComponent] }).compileComponents();
    fixture = TestBed.createComponent(DataTableComponent);
    component = fixture.componentInstance;
    component.columns = COLS as TableColumn<unknown>[];
    component.rows = [];
    fixture.detectChanges();
  });

  it('renders correct number of header columns', () => {
    const ths = fixture.nativeElement.querySelectorAll('thead th');
    expect(ths.length).toBe(2);
  });

  it('emits sortChange with desc on first click of unsorted column', () => {
    const emitted: { key: string; dir: string }[] = [];
    component.sortChange.subscribe((v) => emitted.push(v));
    component.onSort(COLS[0] as TableColumn<unknown>);
    expect(emitted[0]).toEqual({ key: 'id', dir: 'desc' });
  });

  it('toggles to asc when already sorted desc', () => {
    component.sortKey = 'id';
    component.sortDir = 'desc';
    const emitted: { key: string; dir: string }[] = [];
    component.sortChange.subscribe((v) => emitted.push(v));
    component.onSort(COLS[0] as TableColumn<unknown>);
    expect(emitted[0]).toEqual({ key: 'id', dir: 'asc' });
  });

  it('shows loading spinner when loading=true', () => {
    component.loading = true;
    fixture.detectChanges();
    const spinner = fixture.nativeElement.querySelector('.spinner-border');
    expect(spinner).toBeTruthy();
  });

  it('shows empty message when rows is empty and not loading', () => {
    component.loading = false;
    component.rows = [];
    fixture.detectChanges();
    const td = fixture.nativeElement.querySelector('td');
    expect(td?.textContent).toContain('No results');
  });
});
