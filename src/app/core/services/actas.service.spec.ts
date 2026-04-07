import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { ActasService } from './actas.service';
import { environment } from '../../../environments/environment';

describe('ActasService', () => {
  let service: ActasService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ActasService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(ActasService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should post payload for notificarActa', () => {
    const payload = { responsable: { id: '1' }, activos: [] };
    service.notificarActa(payload).subscribe();

    const req = httpMock.expectOne(`${environment.API_URL}/asignacion/notificar-asignacion`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush({ ok: true });
  });

  it('should call reactivarAsignacion endpoint', () => {
    service.reactivarAsignacion(10).subscribe();
    const req = httpMock.expectOne(`${environment.API_URL}/asignacion/reactivar-asignacion`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ asignacionId: 10 });
    req.flush({ message: 'ok' });
  });

  it('should resolve direct acta URL from a nested relative path', () => {
    const apiOrigin = new URL(environment.API_URL).origin;

    expect(service.getActaUrl('public/actas/acta_13.pdf')).toBe(
      `${apiOrigin}/public/actas/acta_13.pdf`
    );
  });

  it('should keep absolute acta URL when backend returns one', () => {
    expect(service.getActaUrl('https://cdn.example.com/actas/acta_13.pdf?download=1')).toBe(
      'https://cdn.example.com/actas/acta_13.pdf?download=1'
    );
  });

  it('should try alternative URL when first PDF path fails', () => {
    let result: Blob | null = null;
    service.getActaPdf('acta_13.pdf').subscribe((blob) => {
      result = blob;
    });

    const first = httpMock.expectOne((req) =>
      req.method === 'GET' && req.url.includes('/api/v1/public/actas/acta_13.pdf')
    );
    first.flush(new Blob(['Not found']), { status: 404, statusText: 'Not Found' });

    const second = httpMock.expectOne((req) =>
      req.method === 'GET'
      && req.url.includes('/public/actas/acta_13.pdf')
      && !req.url.includes('/api/v1/public/actas')
    );
    second.flush(new Blob(['pdf-content'], { type: 'application/pdf' }));

    expect(result).toBeTruthy();
    expect(result).toBeInstanceOf(Blob);
  });
});
