import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { DashboardService } from './dashboard.service';
import { environment } from '../../../environments/environment';

describe('DashboardService', () => {
  let service: DashboardService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        DashboardService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(DashboardService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should sanitize filters and send expected query params', () => {
    service.getStats({
      tiendaId: 5,
      estados: [' Disponible ', 'Asignado', 'Disponible'],
      tipos: ['Laptop'],
    }).subscribe();

    const req = httpMock.expectOne((request) =>
      request.url === `${environment.API_URL}/dashboard/stats`
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('tiendaId')).toBe('5');
    expect(req.request.params.getAll('estados')).toEqual(['Asignado', 'Disponible']);
    expect(req.request.params.getAll('estado')).toEqual(['Asignado', 'Disponible']);
    expect(req.request.params.get('tipos')).toBe('Laptop');
    expect(req.request.params.get('tipo')).toBe('Laptop');

    req.flush({
      kpis: { totalActas: 0, totalActivos: 0, disponibles: 0, responsables: 0 },
      porTipo: [],
      porEstado: [],
    });
  });

  it('should omit tiendaId when not provided', () => {
    service.getStats({ tiendaId: null }).subscribe();
    const req = httpMock.expectOne((request) =>
      request.url === `${environment.API_URL}/dashboard/stats`
    );
    expect(req.request.params.has('tiendaId')).toBe(false);
    req.flush({
      kpis: { totalActas: 0, totalActivos: 0, disponibles: 0, responsables: 0 },
      porTipo: [],
      porEstado: [],
    });
  });
});
