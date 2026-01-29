import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import {MatIconModule} from '@angular/material/icon'

@Component({
  standalone: true,
  selector: 'app-dialog',
  template: `
    <h2 mat-dialog-title>Confirmar generación</h2>

    <mat-dialog-content>
      <p>
        Se generará el acta con
        <strong>{{ data.totalActivos }}</strong> activos asignados.
      </p>
      <p>¿Deseas continuar?</p>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-mini-fab color="accent" (click)="cancelar()">
        <span class="material-icons">cancel</span>
      </button>
      <button mat-mini-fab color="primary" (click)="confirmar()">
        <span class="material-icons">done</span>
      </button>
    </mat-dialog-actions>
  `,
  imports: [MatDialogModule, MatButtonModule]
})
export class Dialog {

  constructor(
    private dialogRef: MatDialogRef<Dialog>,
    @Inject(MAT_DIALOG_DATA) public data: { totalActivos: number }
  ) {}

  cancelar() {
    this.dialogRef.close(false);
  }

  confirmar() {
    this.dialogRef.close(true);
  }
}

