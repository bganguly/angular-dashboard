import type { Meta, StoryObj } from '@storybook/angular';
import { PaginationComponent } from '@angular-dashboard/ui';

const meta: Meta<PaginationComponent> = {
  title: 'UI/Pagination',
  component: PaginationComponent,
  tags: ['autodocs'],
  argTypes: {
    page: { control: { type: 'number', min: 1 } },
    totalPages: { control: { type: 'number', min: 1 } },
    pageChange: { action: 'pageChange' },
  },
};

export default meta;
type Story = StoryObj<PaginationComponent>;

export const FirstPage: Story = {
  args: { page: 1, totalPages: 10 },
};

export const MiddlePage: Story = {
  args: { page: 5, totalPages: 10 },
};

export const LastPage: Story = {
  args: { page: 10, totalPages: 10 },
};

export const SinglePage: Story = {
  args: { page: 1, totalPages: 1 },
};
