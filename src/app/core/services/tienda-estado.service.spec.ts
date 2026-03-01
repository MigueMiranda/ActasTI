import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { TiendaEstadoService } from './tienda-estado.service';
import { InventarioService } from './inventario.service';
import { environment } from '../../../environments/environment';
import { InventarioModel } from '../models/inventario.model';

describe('TiendaEstadoService', () => {
  let service: TiendaEstadoService;
  let httpMock: HttpTestingController;
  let inventarioServiceSpy: {
    getInventario: ReturnType<typeof vi.fn>;
    buscarPorCampo: ReturnType<typeof vi.fn>;
    invalidateCache: ReturnType<typeof vi.fn>;
  };

  const baseItem: InventarioModel = {
    serial: 'S1',
    placa: 'P1',
    tipo: 'Laptop',
    fabricante: 'Dell',
    modelo: '5490',
    estado: 'Disponible',
    responsable: 'Miguel',
    hostname: 'PC-001',
    ubicacion: 'Bodega',
    tienda: { tienda_id: 1, nombre: 'Tienda 1' },
    usuario: { id: 1, name: 'Miguel', username: 'MIRAM01', cargo: 'Analista' },
  };

  beforeEach(() => {
    inventarioServiceSpy = {
      getInventario: vi.fn(),
      buscarPorCampo: vi.fn(),
      invalidateCache: vi.fn(),
    };
    inventarioServiceSpy.getInventario.mockReturnValue(of([
      baseItem,
      { ...baseItem, serial: 'S2', placa: 'P2', tipo: 'Monitor', estado: 'Asignado' },
    ]));
    inventarioServiceSpy.buscarPorCampo.mockImplementation((serial: string) => {
      return of({ ...baseItem, serial, estado: 'En Prestamo' });
    });

    TestBed.configureTestingModule({
      providers: [
        TiendaEstadoService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: InventarioService, useValue: inventarioServiceSpy },
      ],
    });
    service = TestBed.inject(TiendaEstadoService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should compute dynamic estados and tipos from inventory', () => {
    expect(service.estados()).toEqual(['Asignado', 'Disponible']);
    expect(service.tipos()).toEqual(['Laptop', 'Monitor']);
  });

  it('should cache getTienda requests', () => {
    service.getTienda().subscribe();
    service.getTienda().subscribe();

    const req = httpMock.expectOne(`${environment.API_URL}/tiendas`);
    req.flush([{ id: 1, nombre: 'Tienda 1' }]);
  });

  it('should refresh items by serial and invalidate cache', () => {
    service.refrescarActivosPorSerial(['S1']);

    expect(inventarioServiceSpy.buscarPorCampo).toHaveBeenCalledWith('S1', 'serial');
    const updated = service.inventario().find((item) => item.serial === 'S1');
    expect(updated?.estado).toBe('En Prestamo');
    expect(inventarioServiceSpy.invalidateCache).toHaveBeenCalled();
  });
});
