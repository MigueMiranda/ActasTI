import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { CrearActaComponent } from './crear-acta';
import { UserService } from '../../../core/services/user.service';
import { InventarioService } from '../../../core/services/inventario.service';
import { TiendaEstadoService } from '../../../core/services/tienda-estado.service';
import { ActasService } from '../../../core/services/actas.service';
import { NotificationService } from '../../../core/services/notification.service';
import { MatDialog } from '@angular/material/dialog';
import { AuthService } from '../../../core/services/auth.service';

describe('CrearActaComponent', () => {
  let component: CrearActaComponent;
  let fixture: ComponentFixture<CrearActaComponent>;
  let dialogSpy: { open: ReturnType<typeof vi.fn> };
  let actasServiceSpy: { notificarActa: ReturnType<typeof vi.fn> };
  let userServiceSpy: { getByUsername: ReturnType<typeof vi.fn> };
  let inventarioServiceSpy: { buscarPorCampo: ReturnType<typeof vi.fn> };
  let tiendaEstadoServiceMock: {
    estados: ReturnType<typeof signal<string[]>>;
    tipos: ReturnType<typeof signal<string[]>>;
    getTienda: ReturnType<typeof vi.fn>;
    refrescarActivosPorSerial: ReturnType<typeof vi.fn>;
  };
  let notificationSpy: {
    success: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
  };
  let authServiceSpy: { getUserStoreId: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    localStorage.clear();

    dialogSpy = { open: vi.fn() };
    actasServiceSpy = { notificarActa: vi.fn() };
    userServiceSpy = { getByUsername: vi.fn() };
    inventarioServiceSpy = { buscarPorCampo: vi.fn() };
    notificationSpy = {
      success: vi.fn(),
      error: vi.fn(),
    };
    authServiceSpy = {
      getUserStoreId: vi.fn().mockReturnValue(1),
    };

    dialogSpy.open.mockReturnValue({
      afterClosed: () => of(false),
    } as any);
    actasServiceSpy.notificarActa.mockReturnValue(of({ message: 'ok' }));
    userServiceSpy.getByUsername.mockReturnValue(of(null));
    inventarioServiceSpy.buscarPorCampo.mockReturnValue(of(null as any));

    tiendaEstadoServiceMock = {
      estados: signal<string[]>(['Disponible']),
      tipos: signal<string[]>(['Laptop']),
      getTienda: vi.fn().mockReturnValue(of([{ id: 1, nombre: 'Tienda A' }])),
      refrescarActivosPorSerial: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [CrearActaComponent],
      providers: [
        { provide: MatDialog, useValue: dialogSpy },
        { provide: ActasService, useValue: actasServiceSpy },
        { provide: NotificationService, useValue: notificationSpy },
        { provide: AuthService, useValue: authServiceSpy },
        { provide: UserService, useValue: userServiceSpy },
        { provide: InventarioService, useValue: inventarioServiceSpy },
        { provide: TiendaEstadoService, useValue: tiendaEstadoServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CrearActaComponent);
    component = fixture.componentInstance;
    component.stepper = {
      next: vi.fn(),
      reset: vi.fn(),
      selectedIndex: 0,
    } as any;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should open technical data dialog and keep returned data', () => {
    dialogSpy.open.mockReturnValue({
      afterClosed: () => of({
        hostname: 'PC-009',
        ipCableada: '10.0.0.9',
        macCableada: 'AA:BB:CC:DD:EE:FF',
        ipInalambrica: '',
        macInalambrica: '',
        disco: '512 GB',
        memoria: '16 GB',
        mouse: 'Si',
        teclado: 'No',
      }),
    } as any);

    component.abrirDatosTecnicos();

    expect(component.datosTecnicosActivo().hostname).toBe('PC-009');
    expect(component.datosTecnicosActivo().mouse).toBe('Si');
  });

  it('should add asset with technical data on guardarActivoYContinuar', () => {
    component.activosForm.patchValue({
      serial: 'S1',
      placa: 'P1',
      tipo: 'Laptop',
      marca: 'Dell',
      modelo: '5490',
    });
    component.datosTecnicosActivo.set({
      hostname: 'PC-001',
      ipCableada: '10.0.0.1',
      macCableada: 'AA:BB:CC:11:22:33',
      ipInalambrica: '',
      macInalambrica: '',
      disco: '256',
      memoria: '8',
      mouse: 'Si',
      teclado: 'Si',
    });

    component.guardarActivoYContinuar();

    expect(component.activosAgregados().length).toBe(1);
    expect(component.activosAgregados()[0]['hostname']).toBe('PC-001');
    expect(component.activosAgregados()[0]['ip_cableada']).toBe('10.0.0.1');
  });

  it('should notify backend and refresh inventory after crearActaFinal', () => {
    component.responsableForm.patchValue({
      usuario: 'MIRAM01',
      cedula: '1082902763',
      nombre: 'Miguel',
      cargo: 'Analista',
      correo: 'mmiranda@homecenter.co',
    });
    component.ubicacionForm.patchValue({
      tiendaId: 1 as any,
      estado: 'Disponible',
      ubicacion: 'Bodega',
    } as any);
    component.activosAgregados.set([
      { serial: 'S1', placa: 'P1', tipo: 'Laptop', marca: 'Dell', modelo: '5490' },
    ]);

    component.crearActaFinal();

    expect(actasServiceSpy.notificarActa).toHaveBeenCalled();
    expect(tiendaEstadoServiceMock.refrescarActivosPorSerial).toHaveBeenCalledWith(['S1']);
    expect(notificationSpy.success).toHaveBeenCalled();
  });

  it('should reset form state and remove draft when cancelarActa is confirmed', () => {
    dialogSpy.open.mockReturnValue({
      afterClosed: () => of(true),
    } as any);
    const stepperResetSpy = vi.spyOn(component.stepper, 'reset');

    localStorage.setItem('acta_borrador', JSON.stringify({
      responsable: { usuario: 'MIRAM01' },
      activos: [{ serial: 'S1', placa: 'P1' }],
      ubicacion: { tiendaId: 1, estado: 'Disponible', ubicacion: 'Bodega' },
    }));

    component.responsableForm.patchValue({
      usuario: 'MIRAM01',
      cedula: '1082902763',
      nombre: 'Miguel',
      cargo: 'Analista',
      correo: 'mmiranda@homecenter.co',
    });
    component.activosForm.patchValue({
      serial: 'S1',
      placa: 'P1',
      tipo: 'Laptop',
      marca: 'Dell',
      modelo: '5490',
    });
    component.ubicacionForm.patchValue({
      tiendaId: 1 as any,
      estado: 'Disponible',
      ubicacion: 'Bodega',
    } as any);
    component.activosAgregados.set([
      { serial: 'S1', placa: 'P1', tipo: 'Laptop', marca: 'Dell', modelo: '5490' },
    ]);
    component.datosTecnicosActivo.set({
      hostname: 'PC-001',
      ipCableada: '10.0.0.1',
      macCableada: 'AA:BB:CC:11:22:33',
      ipInalambrica: '',
      macInalambrica: '',
      disco: '256',
      memoria: '8',
      mouse: 'Si',
      teclado: 'Si',
    });

    component.cancelarActa();

    expect(localStorage.getItem('acta_borrador')).toBeNull();
    expect(component.activosAgregados()).toEqual([]);
    expect(component.datosTecnicosActivo().hostname).toBe('');
    expect(component.ubicacionForm.get('tiendaId')?.value).toBe(1);
    expect(stepperResetSpy).toHaveBeenCalled();
  });
});
