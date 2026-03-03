import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { vi } from 'vitest';

import { ListarActa } from './listar-acta';
import { ActasService } from '../../../core/services/actas.service';
import { NotificationService } from '../../../core/services/notification.service';

describe('ListarActa', () => {
  let component: ListarActa;
  let fixture: ComponentFixture<ListarActa>;
  let actasServiceSpy: {
    getMovimientos: ReturnType<typeof vi.fn>;
    getTiendas: ReturnType<typeof vi.fn>;
    reactivarAsignacion: ReturnType<typeof vi.fn>;
    getActaPdf: ReturnType<typeof vi.fn>;
  };
  let dialogSpy: { open: ReturnType<typeof vi.fn> };
  let notificationSpy: {
    success: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
  };

  const groupedMov = [
    [{
      id: 10,
      serial: 'S-001',
      acta: 'N/A',
      asignacion: { id: 77, estado_asignacion: 'cancelado', created_at: new Date() },
      tienda: { nombre: 'Tienda A' },
      users: { name: 'Miguel' },
      caso: 'pendiente',
      ubicacionElemento: 'Bodega',
      elemento: [],
    }],
    [{
      id: 11,
      serial: 'X-999',
      acta: 'N/A',
      asignacion: { id: 88, estado_asignacion: 'cancelado', created_at: new Date() },
      tienda: { nombre: 'Tienda B' },
      users: { name: 'Laura' },
      caso: 'pendiente',
      ubicacionElemento: 'Piso 2',
      elemento: [],
    }],
  ];

  beforeEach(async () => {
    actasServiceSpy = {
      getMovimientos: vi.fn(),
      getTiendas: vi.fn(),
      reactivarAsignacion: vi.fn(),
      getActaPdf: vi.fn(),
    };
    dialogSpy = { open: vi.fn() };
    notificationSpy = {
      success: vi.fn(),
      error: vi.fn(),
    };

    actasServiceSpy.getMovimientos.mockReturnValue(of(groupedMov as any));
    actasServiceSpy.getTiendas.mockReturnValue(of([
      { id: 1, nombre: 'Tienda A' },
      { id: 2, nombre: 'Tienda B' },
    ]));
    actasServiceSpy.reactivarAsignacion.mockReturnValue(of({ message: 'ok' }));
    dialogSpy.open.mockReturnValue({ afterClosed: () => of(true) } as any);

    await TestBed.configureTestingModule({
      imports: [ListarActa],
      providers: [
        { provide: ActasService, useValue: actasServiceSpy },
        { provide: MatDialog, useValue: dialogSpy },
        { provide: NotificationService, useValue: notificationSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ListarActa);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load and format grouped movimientos', () => {
    expect(component.movimientos().length).toBe(2);
    expect(component.movimientos()[0].id).toBe(10);
    expect(component.movimientos()[0].elemento.length).toBe(1);
    expect(component.movimientos()[0].tiendaNombre).toBe('Tienda A');
  });

  it('should allow reactivation when state is cancelado and without acta', () => {
    const mov = component.movimientos()[0];
    expect(component.puedeReactivar(mov)).toBe(true);
  });

  it('should search by serial globally even with store filter selected', () => {
    component.actualizarFiltro('tienda', 'Tienda A');
    expect(component.movimientosFiltrados().length).toBe(1);
    expect(component.movimientosFiltrados()[0].id).toBe(10);

    component.actualizarFiltro('serial', 'X-999');
    expect(component.movimientosFiltrados().length).toBe(1);
    expect(component.movimientosFiltrados()[0].id).toBe(11);
  });

  it('should reactivate movimiento after confirmation', () => {
    const mov = component.movimientos()[0];
    vi.spyOn(component, 'cargarMovimientos').mockImplementation(() => {});
    const event = { stopPropagation: vi.fn() } as any as MouseEvent;

    component.reactivar(mov, event);

    expect(event.stopPropagation).toHaveBeenCalled();
    expect(dialogSpy.open).toHaveBeenCalled();
    expect(actasServiceSpy.reactivarAsignacion).toHaveBeenCalledWith(77);
    expect(notificationSpy.success).toHaveBeenCalled();
  });
});
