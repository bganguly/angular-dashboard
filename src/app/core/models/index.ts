export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'REFUNDED';

export interface CustomerSummary {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
}

export interface RegionSummary {
  id: number;
  code: string;
  name: string;
}

export interface ProductSummary {
  id: number;
  sku: string;
  name: string;
}

export interface OrderItemDTO {
  id: number;
  productId: number;
  quantity: number;
  unitPrice: number;
  discount: number;
  product?: ProductSummary;
}

export interface OrderDTO {
  id: number;
  status: OrderStatus;
  total: number;
  currency: string;
  notes: string | null;
  placedAt: string;
  customer: CustomerSummary;
  region: RegionSummary;
  items: OrderItemDTO[];
}

export interface OrderListResult {
  data: OrderDTO[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  approximate: boolean;
}

export interface OrderFilters {
  q?: string | null;
  status?: string | null;
  regionCode?: string | null;
  from?: string | null;
  to?: string | null;
  minTotal?: number | null;
  maxTotal?: number | null;
  page?: number;
  pageSize?: number;
  sort?: string;
  dir?: 'asc' | 'desc';
}

export interface CustomerDTO {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  region: RegionSummary;
  createdAt: string;
}

export interface CustomerListResult {
  data: CustomerDTO[];
  nextCursor: number | null;
  hasMore: boolean;
}

export interface CategoryAggregate {
  totalOrders: number;
  totalRevenue: number;
  totalItems: number;
  avgOrderValue: number;
}

export interface DailyAggregate {
  date: string;
  categories: Record<string, CategoryAggregate>;
  totals: { totalOrders: number; totalRevenue: number; totalItems: number };
}

export interface AggregateResult {
  data: DailyAggregate[];
  totalOrders: number;
  totalOrdersApproximate: boolean;
}
