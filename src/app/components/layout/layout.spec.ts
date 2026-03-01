import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { vi } from 'vitest';

import { AuthService } from '../../core/services/auth.service';
import { Layout } from './layout';

describe('Layout', () => {
  let component: Layout;
  let fixture: ComponentFixture<Layout>;
  let authServiceSpy: {
    getUsername: ReturnType<typeof vi.fn>;
    logout: ReturnType<typeof vi.fn>;
  };
  let router: Router;

  beforeEach(async () => {
    authServiceSpy = {
      getUsername: vi.fn(),
      logout: vi.fn(),
    };
    authServiceSpy.getUsername.mockReturnValue('Miguel Angel Miranda');

    await TestBed.configureTestingModule({
      imports: [Layout],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceSpy },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);

    fixture = TestBed.createComponent(Layout);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should set first name on init', () => {
    expect(component.userName).toBe('Miguel');
  });

  it('should toggle sidebar state', () => {
    expect(component.sidebarCollapsed).toBe(true);
    component.toggleSidebar();
    expect(component.sidebarCollapsed).toBe(false);
  });

  it('should clear storage and navigate on logout', async () => {
    localStorage.setItem('acta_borrador', '1');
    component.logout();

    expect(authServiceSpy.logout).toHaveBeenCalled();
    expect(localStorage.getItem('acta_borrador')).toBeNull();
    expect(router.navigate).toHaveBeenCalledWith(['/']);
  });
});
