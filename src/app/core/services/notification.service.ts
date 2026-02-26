import { Injectable, inject } from '@angular/core';
import { MatSnackBar, MatSnackBarConfig } from '@angular/material/snack-bar';

type ToastKind = 'success' | 'error' | 'info';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private snackBar = inject(MatSnackBar);

  private readonly baseConfig: MatSnackBarConfig = {
    horizontalPosition: 'end',
    verticalPosition: 'top',
  };

  success(message: string, duration = 4000): void {
    this.show(message, 'success', duration);
  }

  error(message: string, duration = 5000): void {
    this.show(message, 'error', duration);
  }

  info(message: string, duration = 3500): void {
    this.show(message, 'info', duration);
  }

  private show(message: string, kind: ToastKind, duration: number): void {
    this.snackBar.open(message, '', {
      ...this.baseConfig,
      duration,
      panelClass: [`toast-${kind}`],
    });
  }
}
