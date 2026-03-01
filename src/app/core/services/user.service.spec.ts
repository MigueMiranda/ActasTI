import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { UserService } from './user.service';
import { environment } from '../../../environments/environment';

describe('UserService', () => {
  let service: UserService;
  let httpMock: HttpTestingController;

  const mockUser = {
    id: '1082902763',
    name: 'Miguel Angel Miranda',
    username: 'MIRAM01',
    cargo: 'Analista',
    email: 'mmiranda@homecenter.co',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        UserService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(UserService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should return user from first endpoint and cache response', () => {
    let firstResult: any;
    let secondResult: any;

    service.getByUsername('MIRAM01').subscribe((user) => { firstResult = user; });
    const req = httpMock.expectOne(`${environment.API_URL}/users/MIRAM01`);
    expect(req.request.method).toBe('GET');
    req.flush(mockUser);

    service.getByUsername('miram01').subscribe((user) => { secondResult = user; });
    httpMock.expectNone(`${environment.API_URL}/users/miram01`);

    expect(firstResult?.username).toBe('MIRAM01');
    expect(secondResult?.username).toBe('MIRAM01');
  });

  it('should fallback to username query endpoint when first request returns 404', () => {
    let result: any;
    service.getByUsername('ROMS17').subscribe((user) => { result = user; });

    const first = httpMock.expectOne(`${environment.API_URL}/users/ROMS17`);
    first.flush({}, { status: 404, statusText: 'Not Found' });

    const second = httpMock.expectOne((request) =>
      request.url === `${environment.API_URL}/users`
      && request.params.get('username') === 'ROMS17'
    );
    second.flush({ data: [{ ...mockUser, username: 'ROMS17' }] });

    expect(result?.username).toBe('ROMS17');
  });

  it('should stop fallback flow on unauthorized error', () => {
    let statusCode: number | null = null;
    service.getByUsername('MIRAM01').subscribe({
      error: (err) => {
        statusCode = err?.status ?? null;
      },
    });

    const first = httpMock.expectOne(`${environment.API_URL}/users/MIRAM01`);
    first.flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(statusCode).toBe(401);
    const pending = httpMock.match(() => true);
    expect(pending.length).toBe(0);
  });
});
