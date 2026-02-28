import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';

export interface DatosTecnicosFormValue {
  hostname: string;
  ipCableada: string;
  macCableada: string;
  ipInalambrica: string;
  macInalambrica: string;
  disco: string;
  memoria: string;
  mouse: 'Si' | 'No' | '';
  teclado: 'Si' | 'No' | '';
}

@Component({
  selector: 'app-datos-tecnicos-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
  ],
  template: `
    <h2 mat-dialog-title>Datos tecnicos del activo</h2>

    <mat-dialog-content class="dt-content" [formGroup]="form">
      <div class="dt-grid">
        <mat-form-field appearance="outline">
          <mat-label>Hostname</mat-label>
          <input matInput formControlName="hostname" />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>IP cableada</mat-label>
          <input matInput formControlName="ipCableada" />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>MAC cableada</mat-label>
          <input matInput formControlName="macCableada" />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>IP inalambrica</mat-label>
          <input matInput formControlName="ipInalambrica" />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>MAC inalambrica</mat-label>
          <input matInput formControlName="macInalambrica" />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Capacidad disco duro</mat-label>
          <input matInput formControlName="disco" />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Memoria</mat-label>
          <input matInput formControlName="memoria" />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Mouse</mat-label>
          <mat-select formControlName="mouse">
            <mat-option value="">Sin definir</mat-option>
            <mat-option value="Si">Si</mat-option>
            <mat-option value="No">No</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Teclado</mat-label>
          <mat-select formControlName="teclado">
            <mat-option value="">Sin definir</mat-option>
            <mat-option value="Si">Si</mat-option>
            <mat-option value="No">No</mat-option>
          </mat-select>
        </mat-form-field>
      </div>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button type="button" (click)="cancelar()">Cancelar</button>
      <button mat-raised-button color="primary" type="button" (click)="guardar()">Guardar</button>
    </mat-dialog-actions>
  `,
})
export class DatosTecnicosDialogComponent {
  private fb = inject(FormBuilder);
  private data = (inject(MAT_DIALOG_DATA, { optional: true }) ?? null) as Partial<DatosTecnicosFormValue> | null;

  form = this.fb.nonNullable.group({
    hostname: this.normalizeString(this.data?.hostname),
    ipCableada: this.normalizeString(this.data?.ipCableada),
    macCableada: this.normalizeString(this.data?.macCableada),
    ipInalambrica: this.normalizeString(this.data?.ipInalambrica),
    macInalambrica: this.normalizeString(this.data?.macInalambrica),
    disco: this.normalizeString(this.data?.disco),
    memoria: this.normalizeString(this.data?.memoria),
    mouse: this.normalizeChoice(this.data?.mouse),
    teclado: this.normalizeChoice(this.data?.teclado),
  });

  constructor(
    private dialogRef: MatDialogRef<DatosTecnicosDialogComponent, DatosTecnicosFormValue>,
  ) { }

  cancelar(): void {
    this.dialogRef.close();
  }

  guardar(): void {
    const raw = this.form.getRawValue();
    this.dialogRef.close({
      hostname: this.normalizeString(raw.hostname),
      ipCableada: this.normalizeString(raw.ipCableada),
      macCableada: this.normalizeString(raw.macCableada),
      ipInalambrica: this.normalizeString(raw.ipInalambrica),
      macInalambrica: this.normalizeString(raw.macInalambrica),
      disco: this.normalizeString(raw.disco),
      memoria: this.normalizeString(raw.memoria),
      mouse: this.normalizeChoice(raw.mouse),
      teclado: this.normalizeChoice(raw.teclado),
    });
  }

  private normalizeString(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
  }

  private normalizeChoice(value: unknown): 'Si' | 'No' | '' {
    if (typeof value !== 'string') {
      return '';
    }

    const normalized = value.trim().toLowerCase();
    if (normalized === 'si' || normalized === 's' || normalized === 'true' || normalized === '1') {
      return 'Si';
    }
    if (normalized === 'no' || normalized === 'n' || normalized === 'false' || normalized === '0') {
      return 'No';
    }
    return '';
  }
}
