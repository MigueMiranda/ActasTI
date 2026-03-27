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

    const req = httpMock.expectOne(`${environment.API_URL}/elementos?all=true`);
    expect(req.request.method).toBe('GET');
    req.flush({ data: [mockItem], total: 1, limit: 100 });

    expect(first?.length).toBe(1);
    expect(second?.length).toBe(1);
  });

  it('should invalidate cache and fetch again', () => {
    service.getInventario().subscribe();
    httpMock.expectOne(`${environment.API_URL}/elementos?all=true`).flush({ data: [], total: 0, limit: 100 });

    service.invalidateCache();

    service.getInventario().subscribe();
    const req = httpMock.expectOne(`${environment.API_URL}/elementos?all=true`);
    expect(req.request.method).toBe('GET');
    req.flush({ data: [], total: 0, limit: 100 });
  });

  it('should search by field with encoded value', () => {
    service.buscarPorCampo('SERIAL 01', 'serial').subscribe();
    const req = httpMock.expectOne(`${environment.API_URL}/elementos/serial/SERIAL%2001`);
    expect(req.request.method).toBe('GET');
    req.flush(mockItem);
  });

  it('should send store params when tiendaId is provided', () => {
    service.getInventario(false, 7).subscribe();

    const req = httpMock.expectOne((request) =>
      request.url === `${environment.API_URL}/elementos`
      && request.params.get('tiendaId') === '7'
      && request.params.get('tienda_id') === '7'
    );

    expect(req.request.method).toBe('GET');
    req.flush({ data: [mockItem], total: 1, limit: 100 });
  });

  it('should post individual payload to carga endpoint', () => {
    const payload = {
      serial: 'NEW-01',
      placa: 'PL-01',
      tipo: 'CPU',
      ubicacion: 'Cuarto de TI',
      fabricante: 'HP',
      modelo: 'Pro SFF 400',
      estado: 'Disponible',
      tienda_id: 41,
    };

    service.cargarElemento(payload).subscribe();

    const req = httpMock.expectOne(`${environment.API_URL}/elementos/carga`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush({
      ok: true,
      mode: 'single',
      dryRun: false,
      processedRows: 1,
      summary: { inserted: 1, updated: 0 },
      issues: { warnings: [], errors: [] },
    });
  });

  it('should upload csv file using multipart form data', () => {
    const file = new File(['serial,placa\nA1,P1'], 'elementos.csv', { type: 'text/csv' });

    service.cargarArchivoCsv(file).subscribe();

    const req = httpMock.expectOne(`${environment.API_URL}/elementos/carga`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body instanceof FormData).toBe(true);
    expect((req.request.body as FormData).get('file')).toBe(file);
    req.flush({
      ok: true,
      mode: 'massive',
      dryRun: false,
      processedRows: 1,
      summary: { inserted: 1, updated: 0 },
      issues: { warnings: [], errors: [] },
    });
  });
});
