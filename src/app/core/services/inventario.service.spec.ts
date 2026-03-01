import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { InventarioService } from './inventario.service';
import { environment } from '../../../environments/environment';
import { InventarioModel } from '../models/inventario.model';

describe('InventarioService', () => {
  let service: InventarioService;
  let httpMock: HttpTestingController;

  const mockItem: InventarioModel = {
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
    TestBed.configureTestingModule({
      providers: [
        InventarioService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(InventarioService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should cache inventory requests', () => {
    let first: InventarioModel[] | undefined;
    let second: InventarioModel[] | undefined;

    service.getInventario().subscribe((data) => { first = data; });
    service.getInventario().subscribe((data) => { second = data; });

    const req = httpMock.expectOne(`${environment.API_URL}/elementos`);
    expect(req.request.method).toBe('GET');
    req.flush({ data: [mockItem], total: 1, limit: 100 });

    expect(first?.length).toBe(1);
    expect(second?.length).toBe(1);
  });

  it('should invalidate cache and fetch again', () => {
    service.getInventario().subscribe();
    httpMock.expectOne(`${environment.API_URL}/elementos`).flush({ data: [], total: 0, limit: 100 });

    service.invalidateCache();

    service.getInventario().subscribe();
    const req = httpMock.expectOne(`${environment.API_URL}/elementos`);
    expect(req.request.method).toBe('GET');
    req.flush({ data: [], total: 0, limit: 100 });
  });

  it('should search by field with encoded value', () => {
    service.buscarPorCampo('SERIAL 01', 'serial').subscribe();
    const req = httpMock.expectOne(`${environment.API_URL}/elementos/serial/SERIAL%2001`);
    expect(req.request.method).toBe('GET');
    req.flush(mockItem);
  });
});
