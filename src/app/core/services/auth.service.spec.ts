import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  const sessionKey = 'actasti_auth_session';

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        AuthService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    sessionStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should persist session on successful login', () => {
    let responseSession: unknown;
    service.login('MIRAM01', '1234').subscribe((session) => {
      responseSession = session;
    });

    const req = httpMock.expectOne(`${environment.API_URL}/auth/login`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ username: 'MIRAM01', password: '1234' });
    req.flush({
      token: 'token-abc',
      user: { username: 'MIRAM01', name: 'Miguel', cargo: 'Analista' },
    });

    expect(responseSession).toBeTruthy();
    expect(service.isAuthenticated()).toBe(true);
    expect(service.getUsername()).toBe('Miguel');
    expect(service.getToken()).toBe('token-abc');
    expect(sessionStorage.getItem(sessionKey)).toContain('token-abc');
  });

  it('should fail login when response has no token', () => {
    let errorMessage = '';
    service.login('MIRAM01', '1234').subscribe({
      error: (err) => {
        errorMessage = String(err?.message ?? err);
      },
    });

    const req = httpMock.expectOne(`${environment.API_URL}/auth/login`);
    req.flush({ user: { username: 'MIRAM01', name: 'Miguel' } });

    expect(errorMessage).toContain('Token no presente');
    expect(service.isAuthenticated()).toBe(false);
  });

  it('should invalidate expired session', () => {
    const now = Date.now();
    sessionStorage.setItem(sessionKey, JSON.stringify({
      username: 'MIRAM01',
      token: 'abc',
      name: 'Miguel',
      cargo: 'Analista',
      issuedAt: now - 10_000,
      expiresAt: now - 5_000,
    }));

    expect(service.isAuthenticated()).toBe(false);
    expect(sessionStorage.getItem(sessionKey)).toBeNull();
  });
});
