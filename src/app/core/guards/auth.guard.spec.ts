import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { vi } from 'vitest';

import { AuthGuard } from './auth.guard';
import { AuthService } from '../services/auth.service';

describe('AuthGuard', () => {
  let service: AuthGuard;
  let authServiceSpy: { isAuthenticated: ReturnType<typeof vi.fn> };
  let router: Router;

  beforeEach(() => {
    authServiceSpy = {
      isAuthenticated: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceSpy },
      ],
    });
    service = TestBed.inject(AuthGuard);
    router = TestBed.inject(Router);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should allow navigation when session is valid', () => {
    authServiceSpy.isAuthenticated.mockReturnValue(true);
    const result = service.canActivate({} as any, { url: '/inicio' } as any);
    expect(result).toBe(true);
  });

  it('should redirect to login with redirect param when session is invalid', () => {
    authServiceSpy.isAuthenticated.mockReturnValue(false);
    const result = service.canActivate({} as any, { url: '/crear-acta' } as any);
    expect(result instanceof Object).toBe(true);
    const serialized = router.serializeUrl(result as any);
    expect(serialized).toContain('redirect=%2Fcrear-acta');
  });
});
