import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { Login } from './login';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';

describe('Login', () => {
  let component: Login;
  let fixture: ComponentFixture<Login>;
  let authServiceSpy: {
    isAuthenticated: ReturnType<typeof vi.fn>;
    login: ReturnType<typeof vi.fn>;
  };
  let notificationSpy: {
    success: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
  };
  let router: Router;
  let activatedRouteStub: {
    snapshot: { queryParamMap: ReturnType<typeof convertToParamMap> };
  };

  beforeEach(async () => {
    authServiceSpy = {
      isAuthenticated: vi.fn(),
      login: vi.fn(),
    };
    notificationSpy = {
      success: vi.fn(),
      error: vi.fn(),
    };

    activatedRouteStub = {
      snapshot: {
        queryParamMap: convertToParamMap({}),
      },
    };
    authServiceSpy.isAuthenticated.mockReturnValue(false);

    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceSpy },
        { provide: NotificationService, useValue: notificationSpy },
        {
          provide: ActivatedRoute,
          useValue: activatedRouteStub,
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Login);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should redirect to inicio when already authenticated', () => {
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    authServiceSpy.isAuthenticated.mockReturnValue(true);

    component.ngOnInit();

    expect(navigateSpy).toHaveBeenCalledWith(['/inicio']);
  });

  it('should show validation error when credentials are empty', () => {
    component.usuario = '   ';
    component.password = '';

    component.login();

    expect(notificationSpy.error).toHaveBeenCalledWith('Usuario o contraseña incorrectos');
    expect(authServiceSpy.login).not.toHaveBeenCalled();
  });

  it('should login successfully and navigate to safe redirect', () => {
    const navigateByUrlSpy = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

    activatedRouteStub.snapshot.queryParamMap = convertToParamMap({ redirect: '/inventario' });
    authServiceSpy.login.mockReturnValue(of({
      username: 'MIRAM01',
      token: 'abc',
      name: 'Miguel',
      cargo: 'Analista',
      issuedAt: Date.now(),
      expiresAt: Date.now() + 1000,
    } as any));

    component.usuario = 'MIRAM01';
    component.password = '1234';
    component.login();

    expect(notificationSpy.success).toHaveBeenCalledWith('Bienvenido Miguel');
    expect(navigateByUrlSpy).toHaveBeenCalledWith('/inventario');
  });

  it('should show auth error on 401 response', () => {
    authServiceSpy.login.mockReturnValue(throwError(() => ({ status: 401 })));
    component.usuario = 'MIRAM01';
    component.password = 'bad';

    component.login();

    expect(component.mensaje_error).toBe('Usuario o contraseña incorrectos');
    expect(notificationSpy.error).toHaveBeenCalledWith('Usuario o contraseña incorrectos');
  });
});
