import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { AuthService } from '../../../core/services/auth.service';
import { InventarioService } from '../../../core/services/inventario.service';
import { NotificationService } from '../../../core/services/notification.service';
import { TiendaEstadoService } from '../../../core/services/tienda-estado.service';
import { CargueElementosComponent } from './cargue-elementos';

describe('CargueElementosComponent', () => {
  let component: CargueElementosComponent;
  let fixture: ComponentFixture<CargueElementosComponent>;
  let inventarioServiceSpy: {
    cargarElemento: ReturnType<typeof vi.fn>;
    cargarArchivoCsv: ReturnType<typeof vi.fn>;
  };
  let notificationServiceSpy: {
    success: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
  };
  let tiendaEstadoServiceSpy: {
    getTienda: ReturnType<typeof vi.fn>;
  };
  let authServiceSpy: {
    getUserStoreId: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    inventarioServiceSpy = {
      cargarElemento: vi.fn().mockReturnValue(
        of({
          ok: true,
          mode: 'single',
          dryRun: false,
          processedRows: 1,
          summary: { inserted: 1, updated: 0 },
          issues: { warnings: [], errors: [] },
        })
      ),
      cargarArchivoCsv: vi.fn().mockReturnValue(
        of({
          ok: true,
          mode: 'massive',
          dryRun: false,
          processedRows: 2,
          summary: { inserted: 2, updated: 0 },
          issues: { warnings: [], errors: [] },
        })
      ),
    };

    notificationServiceSpy = {
      success: vi.fn(),
      error: vi.fn(),
    };

    tiendaEstadoServiceSpy = {
      getTienda: vi.fn().mockReturnValue(of([{ id: 41, nombre: 'Tienda 41' }])),
    };

    authServiceSpy = {
      getUserStoreId: vi.fn().mockReturnValue(41),
    };

    await TestBed.configureTestingModule({
      imports: [CargueElementosComponent],
      providers: [
        { provide: InventarioService, useValue: inventarioServiceSpy },
        { provide: NotificationService, useValue: notificationServiceSpy },
        { provide: TiendaEstadoService, useValue: tiendaEstadoServiceSpy },
        { provide: AuthService, useValue: authServiceSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CargueElementosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should preload the authenticated store into the form', () => {
    expect(component.contablesForm.get('tienda_id')?.value).toBe(41);
    expect(component.stores()).toEqual([{ id: 41, nombre: 'Tienda 41' }]);
  });

  it('should map the individual form to the backend payload', () => {
    component.contablesForm.patchValue({
      serial: '4CE549BT8N',
      placa: 'SOD172215',
      tipo: 'CPU',
      ubicacion: 'CUARTO DE SISTEMAS',
      fabricante: 'HP',
      modelo: 'PRO SFF 400',
      estado: 'Disponible',
      adendo: 'Sodimac',
      fechaActualizacion: '2026-02-11',
      fechaAsignacion: '2026-02-11',
      responsable: 'Miguel',
      propietario: 'Sodimac',
      observacion: 'Equipo nuevo',
      user_id: 1082902763,
      tienda_id: 41,
    });

    component.tecnicosForm.patchValue({
      memoria: '16 GB',
      disco: '512 GB',
      ipCableada: '10.0.0.15',
      macCableada: 'AA:BB:CC:DD:EE:FF',
      ipInalambrica: '192.168.0.20',
      macInalambrica: '11:22:33:44:55:66',
      teclado: 'N/A',
      mouse: 'N/A',
      hostname: 'PC-001',
    });

    component.onSubmitIndividual();

    expect(inventarioServiceSpy.cargarElemento).toHaveBeenCalledWith(
      expect.objectContaining({
        serial: '4CE549BT8N',
        placa: 'SOD172215',
        fechaActualizacion: '11/02/2026',
        fechaAsignacion: '11/02/2026',
        ip_cableada: '10.0.0.15',
        mac_inalambrica: '11:22:33:44:55:66',
        mouse: 'N/A',
        mause: 'N/A',
        tienda_id: 41,
      })
    );
    expect(notificationServiceSpy.success).toHaveBeenCalled();
  });

  it('should expose summary items for both steps', () => {
    component.contablesForm.patchValue({
      serial: 'SER-01',
      placa: 'PLA-01',
      tipo: 'Portatil',
      ubicacion: 'Bodega',
      fabricante: 'HP',
      modelo: '440 G9',
      estado: 'Disponible',
      tienda_id: 41,
    });

    component.tecnicosForm.patchValue({
      memoria: '16 GB',
      disco: '512 GB',
    });

    expect(component.getContablesSummaryItems().some((item) => item.label === 'Serial' && item.value === 'SER-01')).toBe(true);
    expect(component.getTecnicosSummaryItems().some((item) => item.label === 'Memoria' && item.value === '16 GB')).toBe(true);
  });

  it('should send the selected csv file to the upload endpoint', () => {
    const file = new File(['serial,placa\nA1,P1'], 'lote.csv', { type: 'text/csv' });
    component.cambiarModo('massive');
    component.onFileSelected({ target: { files: [file] } } as unknown as Event);

    component.onSubmitMassive();

    expect(inventarioServiceSpy.cargarArchivoCsv).toHaveBeenCalledWith(file);
    expect(notificationServiceSpy.success).toHaveBeenCalled();
  });
});
