import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { vi } from 'vitest';

import { NotificationService } from './notification.service';

describe('NotificationService', () => {
  let service: NotificationService;
  let snackBarSpy: { open: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    snackBarSpy = { open: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        NotificationService,
        { provide: MatSnackBar, useValue: snackBarSpy },
      ],
    });

    service = TestBed.inject(NotificationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should show success toast with expected panel class', () => {
    service.success('ok');
    expect(snackBarSpy.open).toHaveBeenCalledWith(
      'ok',
      '',
      expect.objectContaining({
        duration: 4000,
        panelClass: ['toast-success'],
        horizontalPosition: 'end',
        verticalPosition: 'top',
      })
    );
  });

  it('should show error toast with expected panel class', () => {
    service.error('error', 2000);
    expect(snackBarSpy.open).toHaveBeenCalledWith(
      'error',
      '',
      expect.objectContaining({
        duration: 2000,
        panelClass: ['toast-error'],
      })
    );
  });
});
