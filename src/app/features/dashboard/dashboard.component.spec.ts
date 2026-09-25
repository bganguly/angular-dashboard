import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DashboardComponent } from './dashboard.component';
import { AggregatesService } from '../../core/services/aggregates.service';
import { of } from 'rxjs';
import { AggregateResult } from '../../core/models';
import { provideHttpClient } from '@angular/common/http';

const mockResult: AggregateResult = {
  data: [
    {
      date: '2025-01-01',
      categories: { Electronics: { totalOrders: 10, totalRevenue: 5000, totalItems: 20, avgOrderValue: 500 } },
      totals: { totalOrders: 10, totalRevenue: 5000, totalItems: 20 },
    },
  ],
  totalOrders: 10,
  totalOrdersApproximate: false,
};

describe('DashboardComponent', () => {
  let fixture: ComponentFixture<DashboardComponent>;
  let component: DashboardComponent;

  beforeEach(async () => {
    const aggSpy = { get: jest.fn().mockReturnValue(of(mockResult)) };
    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        provideHttpClient(),
        { provide: AggregatesService, useValue: aggSpy },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('creates', () => expect(component).toBeTruthy());

  it('shows totalOrders KPI after load', () => {
    expect(component.totalOrders()).toBe('10');
  });

  it('computes totalRevenue from data', () => {
    expect(component.totalRevenue()).toContain('5,000');
  });
});
