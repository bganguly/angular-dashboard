import type { Meta, StoryObj } from '@storybook/angular';
import { DataTableComponent, TableColumn } from '@angular-dashboard/ui';

interface SampleRow {
  id: number;
  name: string;
  status: string;
  total: number;
}

const COLUMNS: TableColumn<SampleRow>[] = [
  { key: 'id', label: 'ID', sortable: true },
  { key: 'name', label: 'Customer', sortable: true },
  { key: 'status', label: 'Status', sortable: false },
  { key: 'total', label: 'Total ($)', sortable: true },
];

const ROWS: SampleRow[] = [
  { id: 1, name: 'Alice Johnson', status: 'DELIVERED', total: 49.99 },
  { id: 2, name: 'Bob Smith', status: 'PROCESSING', total: 129.00 },
  { id: 3, name: 'Carol White', status: 'PENDING', total: 9.95 },
];

const meta: Meta<DataTableComponent<SampleRow>> = {
  title: 'UI/DataTable',
  component: DataTableComponent,
  tags: ['autodocs'],
  argTypes: {
    loading: { control: 'boolean' },
    emptyMessage: { control: 'text' },
    sortChange: { action: 'sortChange' },
  },
};

export default meta;
type Story = StoryObj<DataTableComponent<SampleRow>>;

export const Default: Story = {
  args: { columns: COLUMNS, rows: ROWS, loading: false },
};

export const Loading: Story = {
  args: { columns: COLUMNS, rows: [], loading: true },
};

export const Empty: Story = {
  args: { columns: COLUMNS, rows: [], loading: false, emptyMessage: 'No orders match your filters.' },
};
