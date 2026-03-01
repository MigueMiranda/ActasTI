import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { InventarioComponent } from './inventario';
import { InventarioService } from '../../../core/services/inventario.service';
import { NotificationService } from '../../../core/services/notification.service';
import { InventarioModel } from '../../../core/models/inventario.model';

describe('InventarioComponent', () => {
  let component: InventarioComponent;
  let fixture: ComponentFixture<InventarioComponent>;
  let inventarioServiceSpy: { getInventario: ReturnType<typeof vi.fn> };
  let notificationSpy: { error: ReturnType<typeof vi.fn> };

  const item: InventarioModel = {
    serial: 'S1',
    placa: 'P1',
    tipo: 'Laptop',
    fabricante: 'Dell',
    modelo: '5490',
    estado: 'Disponible',
    responsable: 'Miguel',
    hostname: 'PC-001',
    ubicacion: 'Bodega',
    tienda: { tienda_id: 1, nombre: 'Tienda A' },
    usuario: { id: 1, name: 'Miguel', username: 'MIRAM01', cargo: 'Analista' },
  };

  beforeEach(async () => {
    inventarioServiceSpy = {
      getInventario: vi.fn(),
    };
    notificationSpy = {
      error: vi.fn(),
    };
    inventarioServiceSpy.getInventario.mockReturnValue(of([item]));

    await TestBed.configureTestingModule({
      imports: [InventarioComponent],
      providers: [
        { provide: InventarioService, useValue: inventarioServiceSpy },
        { provide: NotificationService, useValue: notificationSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(InventarioComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load inventory on init', () => {
    expect(component.inventario().length).toBe(1);
    expect(component.isLoading()).toBe(false);
  });

  it('should reset filters on cleanFilter', () => {
    component.filterEstado.set('Disponible');
    component.filterTienda.set('Tienda A');
    component.currentPage.set(3);

    component.cleanFilter();

    expect(component.filterEstado()).toBe('');
    expect(component.filterTienda()).toBe('');
    expect(component.currentPage()).toBe(1);
  });

  it('should update filter and reset current page', () => {
    component.currentPage.set(2);
    component.updateFilter('serial', 'S1');
    expect(component.filterSerial()).toBe('S1');
    expect(component.currentPage()).toBe(1);
  });
});
