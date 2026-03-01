import { TestBed } from '@angular/core/testing';
import { HttpHeaders, HttpInterceptorFn, HttpRequest, HttpResponse } from '@angular/common/http';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { authInterceptor } from './auth-interceptor';
import { AuthService } from '../services/auth.service';
import { environment } from '../../../environments/environment';

describe('authInterceptor', () => {
  const interceptor: HttpInterceptorFn = (req, next) =>
    TestBed.runInInjectionContext(() => authInterceptor(req, next));
  let authServiceSpy: { getToken: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    authServiceSpy = { getToken: vi.fn() };
    TestBed.configureTestingModule({
      providers: [{ provide: AuthService, useValue: authServiceSpy }],
    });
  });

  it('should be created', () => {
    expect(interceptor).toBeTruthy();
  });

  it('should attach bearer token to API requests', () => {
    authServiceSpy.getToken.mockReturnValue('abc123');

    const req = new HttpRequest<null>('GET', `${environment.API_URL}/tiendas`, null);
    let authorizationHeader: string | null = null;

    interceptor(req, (nextReq) => {
      authorizationHeader = nextReq.headers.get('Authorization');
      return of(new HttpResponse({ status: 200 }));
    }).subscribe();

    expect(authorizationHeader).toBe('Bearer abc123');
  });

  it('should not attach token for auth login endpoint', () => {
    authServiceSpy.getToken.mockReturnValue('abc123');

    const req = new HttpRequest<null>('POST', `${environment.API_URL}/auth/login`, null);
    let hasAuthorizationHeader = false;

    interceptor(req, (nextReq) => {
      hasAuthorizationHeader = nextReq.headers.has('Authorization');
      return of(new HttpResponse({ status: 200 }));
    }).subscribe();

    expect(hasAuthorizationHeader).toBe(false);
  });

  it('should not override existing Authorization header', () => {
    authServiceSpy.getToken.mockReturnValue('abc123');

    const req = new HttpRequest<null>(
      'GET',
      `${environment.API_URL}/dashboard/stats`,
      null,
      { headers: new HttpHeaders({ Authorization: 'Bearer existing' }) }
    );
    let authorizationHeader: string | null = null;

    interceptor(req, (nextReq) => {
      authorizationHeader = nextReq.headers.get('Authorization');
      return of(new HttpResponse({ status: 200 }));
    }).subscribe();

    expect(authorizationHeader).toBe('Bearer existing');
  });
});
