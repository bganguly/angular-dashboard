import type { Meta, StoryObj } from '@storybook/angular';
import { KpiCardComponent } from '@angular-dashboard/ui';

const meta: Meta<KpiCardComponent> = {
  title: 'UI/KpiCard',
  component: KpiCardComponent,
  tags: ['autodocs'],
  argTypes: {
    label: { control: 'text' },
    value: { control: 'text' },
    icon: { control: 'text' },
  },
};

export default meta;
type Story = StoryObj<KpiCardComponent>;

export const TotalOrders: Story = {
  args: { label: 'Total Orders', value: '4,000,000', icon: '📦' },
};

export const TotalRevenue: Story = {
  args: { label: 'Total Revenue', value: '$12,450,000', icon: '💰' },
};

export const AvgOrderValue: Story = {
  args: { label: 'Avg Order Value', value: '$3.11', icon: '📊' },
};
