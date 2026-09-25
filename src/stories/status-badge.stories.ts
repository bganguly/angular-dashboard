import type { Meta, StoryObj } from '@storybook/angular';
import { StatusBadgeComponent } from '@angular-dashboard/ui';

const meta: Meta<StatusBadgeComponent> = {
  title: 'UI/StatusBadge',
  component: StatusBadgeComponent,
  tags: ['autodocs'],
  argTypes: {
    status: {
      control: 'select',
      options: ['PENDING','CONFIRMED','PROCESSING','SHIPPED','DELIVERED','CANCELLED','REFUNDED'],
    },
  },
};

export default meta;
type Story = StoryObj<StatusBadgeComponent>;

export const Pending: Story = { args: { status: 'PENDING' } };
export const Confirmed: Story = { args: { status: 'CONFIRMED' } };
export const Processing: Story = { args: { status: 'PROCESSING' } };
export const Shipped: Story = { args: { status: 'SHIPPED' } };
export const Delivered: Story = { args: { status: 'DELIVERED' } };
export const Cancelled: Story = { args: { status: 'CANCELLED' } };
export const Refunded: Story = { args: { status: 'REFUNDED' } };
