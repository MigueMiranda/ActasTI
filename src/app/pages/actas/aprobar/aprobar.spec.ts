import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { Aprobar } from './aprobar';
import { ActasService } from '../../../core/services/actas.service';
import { NotificationService } from '../../../core/services/notification.service';

describe('Aprobar', () => {
  let component: Aprobar;
  let fixture: ComponentFixture<Aprobar>;
  let actasServiceSpy: { confirmarAsignacion: ReturnType<typeof vi.fn> };
  let notificationSpy: {
    success: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
  };
  let routeStub: {
    snapshot: { queryParamMap: ReturnType<typeof convertToParamMap> };
  };

  beforeEach(async () => {
    actasServiceSpy = {
      confirmarAsignacion: vi.fn(),
    };
    notificationSpy = {
      success: vi.fn(),
      error: vi.fn(),
    };

    routeStub = {
      snapshot: {
        queryParamMap: convertToParamMap({ token: 'abc', respuesta: 'aprobado' }),
      },
    };

    await TestBed.configureTestingModule({
      imports: [Aprobar],
      providers: [
        { provide: ActivatedRoute, useValue: routeStub },
        { provide: ActasService, useValue: actasServiceSpy },
        { provide: NotificationService, useValue: notificationSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Aprobar);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    actasServiceSpy.confirmarAsignacion.mockReturnValue(of({ message: 'ok' }));
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should set success state when API confirms assignment', () => {
    actasServiceSpy.confirmarAsignacion.mockReturnValue(of({ message: 'Asignacion aprobada' }));

    fixture.detectChanges();

    expect(component.estado).toBe('exito');
    expect(component.mensaje).toContain('Asignacion aprobada');
    expect(notificationSpy.success).toHaveBeenCalled();
  });

  it('should set error state when token is invalid', () => {
    routeStub.snapshot.queryParamMap = convertToParamMap({ token: '', respuesta: 'aprobado' });

    fixture.detectChanges();

    expect(component.estado).toBe('error');
    expect(component.mensaje).toContain('Enlace inválido o incompleto');
    expect(notificationSpy.error).toHaveBeenCalled();
  });

  it('should show expired token final message', () => {
    actasServiceSpy.confirmarAsignacion.mockReturnValue(
      throwError(() => ({ error: { estado: 'expirado', message: 'Token expirado o asignación ya confirmada' } }))
    );

    fixture.detectChanges();

    expect(component.estado).toBe('error');
    expect(component.mensaje).toContain('Token expirado o asignación ya confirmada');
    expect(notificationSpy.error).toHaveBeenCalled();
  });
});
