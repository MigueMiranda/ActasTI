import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { Inicio } from './inicio';
import { DashboardService } from '../../core/services/dashboard.service';
import { TiendaEstadoService } from '../../core/services/tienda-estado.service';
import { NotificationService } from '../../core/services/notification.service';

describe('Inicio', () => {
  let component: Inicio;
  let fixture: ComponentFixture<Inicio>;
  let dashboardServiceSpy: { getStats: ReturnType<typeof vi.fn> };
  let tiendaEstadoServiceMock: {
    estados: ReturnType<typeof signal<string[]>>;
    tipos: ReturnType<typeof signal<string[]>>;
    getTienda: ReturnType<typeof vi.fn>;
  };
  let notificationSpy: { error: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    dashboardServiceSpy = {
      getStats: vi.fn(),
    };
    dashboardServiceSpy.getStats.mockReturnValue(of({
      kpis: { totalActas: 2, totalActivos: 10, disponibles: 4, responsables: 1 },
      porTipo: [],
      porEstado: [],
      porMes: [],
    } as any));

    tiendaEstadoServiceMock = {
      estados: signal<string[]>(['Disponible']),
      tipos: signal<string[]>(['Laptop']),
      getTienda: vi.fn().mockReturnValue(of([{ id: 1, nombre: 'Tienda A' }])),
    };
    notificationSpy = { error: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [Inicio],
      providers: [
        { provide: DashboardService, useValue: dashboardServiceSpy },
        { provide: TiendaEstadoService, useValue: tiendaEstadoServiceMock },
        { provide: NotificationService, useValue: notificationSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Inicio);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should reset all filters', () => {
    component.tiendaSeleccionada.set(5);
    component.estadosSeleccionados.set(['Disponible']);
    component.tiposSeleccionados.set(['Laptop']);

    component.limpiarFiltros();

    expect(component.tiendaSeleccionada()).toBeNull();
    expect(component.estadosSeleccionados()).toEqual([]);
    expect(component.tiposSeleccionados()).toEqual([]);
  });

  it('should update store selection', () => {
    component.onTiendaChange(1);
    expect(component.tiendaSeleccionada()).toBe(1);
  });
});
