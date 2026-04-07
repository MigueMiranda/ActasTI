import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { vi } from 'vitest';

import { ListarActa } from './listar-acta';
import { ActasService } from '../../../core/services/actas.service';
import { NotificationService } from '../../../core/services/notification.service';
import { AuthService } from '../../../core/services/auth.service';

describe('ListarActa', () => {
  let component: ListarActa;
  let fixture: ComponentFixture<ListarActa>;
  let actasServiceSpy: {
    getMovimientos: ReturnType<typeof vi.fn>;
    getTiendas: ReturnType<typeof vi.fn>;
    reactivarAsignacion: ReturnType<typeof vi.fn>;
    getActaUrl: ReturnType<typeof vi.fn>;
  };
  let dialogSpy: { open: ReturnType<typeof vi.fn> };
  let notificationSpy: {
    success: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
  };
  let authServiceSpy: { getUserStoreId: ReturnType<typeof vi.fn> };

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
      getActaUrl: vi.fn(),
    };
    dialogSpy = { open: vi.fn() };
    notificationSpy = {
      success: vi.fn(),
      error: vi.fn(),
    };
    authServiceSpy = {
      getUserStoreId: vi.fn().mockReturnValue(1),
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
        { provide: AuthService, useValue: authServiceSpy },
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
    expect(component.filtroTienda()).toBe(1);
    expect(actasServiceSpy.getMovimientos).toHaveBeenCalledWith(1);
  });

  it('should allow reactivation when state is cancelado and without acta', () => {
    const mov = component.movimientos()[0];
    expect(component.puedeReactivar(mov)).toBe(true);
  });

  it('should apply store filter and serial filter together', () => {
    component.onTiendaChange(1);
    expect(component.movimientosFiltrados().length).toBe(1);
    expect(component.movimientosFiltrados()[0].id).toBe(10);

    component.actualizarFiltro('serial', 'X-999');
    expect(component.movimientosFiltrados().length).toBe(0);
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

  it('should reset filters to user store on limpiarFiltros', () => {
    component.filtroTienda.set(2);
    component.filtroSerial.set('S-001');
    component.filtroResponsable.set('Miguel');
    actasServiceSpy.getMovimientos.mockClear();

    component.limpiarFiltros();

    expect(component.filtroTienda()).toBe(1);
    expect(component.filtroSerial()).toBe('');
    expect(component.filtroResponsable()).toBe('');
    expect(actasServiceSpy.getMovimientos).toHaveBeenCalledWith(1);
  });

  it('should open acta in new window using resolved URL', () => {
    actasServiceSpy.getActaUrl.mockReturnValue('https://bk-actas-sodimac.onrender.com/public/actas/acta-123.pdf');
    const stopPropagation = vi.fn();
    const popupMock = {} as Window;
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(popupMock);

    component.verActa('carpeta/acta-123.pdf', { stopPropagation } as any as MouseEvent);

    expect(stopPropagation).toHaveBeenCalled();
    expect(actasServiceSpy.getActaUrl).toHaveBeenCalledWith('carpeta/acta-123.pdf');
    expect(openSpy).toHaveBeenCalledWith(
      'https://bk-actas-sodimac.onrender.com/public/actas/acta-123.pdf',
      '_blank',
      'noopener,noreferrer'
    );

    openSpy.mockRestore();
  });
});
