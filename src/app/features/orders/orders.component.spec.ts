import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OrdersComponent } from './orders.component';
import { OrdersService } from '../../core/services/orders.service';
import { RegionsService } from '../../core/services/regions.service';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { OrderListResult } from '../../core/models';
import { provideRouter } from '@angular/router';

const mockOrders: OrderListResult = {
  data: [],
  page: 1,
  pageSize: 20,
  total: 0,
  totalPages: 0,
  approximate: false,
};

describe('OrdersComponent', () => {
  let fixture: ComponentFixture<OrdersComponent>;
  let component: OrdersComponent;

  beforeEach(async () => {
    const ordersSpy = { list: jest.fn().mockReturnValue(of(mockOrders)) };
    const regionsSpy = { list: jest.fn().mockReturnValue(of([])) };
    await TestBed.configureTestingModule({
      imports: [OrdersComponent],
      providers: [
        provideRouter([]),
        { provide: OrdersService, useValue: ordersSpy },
        { provide: RegionsService, useValue: regionsSpy },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(OrdersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('creates', () => expect(component).toBeTruthy());

  it('sets total to 0 on empty response', () => {
    expect(component.total()).toBe(0);
  });

  it('onPage updates page and calls fetch', () => {
    const fetchSpy = jest.spyOn(component, 'fetch');
    component.onPage(3);
    expect(component.page()).toBe(3);
    expect(fetchSpy).toHaveBeenCalled();
  });

  it('onSort updates sortKey and sortDir', () => {
    component.onSort({ key: 'total', dir: 'asc' });
    expect(component.sortKey()).toBe('total');
    expect(component.sortDir()).toBe('asc');
  });
});
