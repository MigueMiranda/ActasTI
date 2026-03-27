import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnInit, ViewChild, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatStepper, MatStepperModule } from '@angular/material/stepper';

import { TiendaModel } from '../../../core/models/tienda-estado.model';
import {
  ElementoCargaPayload,
  ElementosCargaResponse,
  InventarioService,
} from '../../../core/services/inventario.service';
import { NotificationService } from '../../../core/services/notification.service';
import { TiendaEstadoService } from '../../../core/services/tienda-estado.service';
import { AuthService } from '../../../core/services/auth.service';

type CargueMode = 'individual' | 'massive';

@Component({
  selector: 'app-cargue-elementos',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatStepperModule],
  templateUrl: './cargue-elementos.html',
})
export class CargueElementosComponent implements OnInit {
  @ViewChild('csvInput') csvInput?: ElementRef<HTMLInputElement>;
  @ViewChild('individualStepper') individualStepper?: MatStepper;

  private fb = inject(FormBuilder);
  private inventarioService = inject(InventarioService);
  private notifications = inject(NotificationService);
  private tiendaEstadoService = inject(TiendaEstadoService);
  private authService = inject(AuthService);

  private readonly userStoreId = this.authService.getUserStoreId();

  readonly mode = signal<CargueMode>('individual');
  readonly stores = signal<TiendaModel[]>([]);
  readonly isLoadingStores = signal(true);
  readonly isSubmitting = signal(false);
  readonly selectedFileName = signal('');
  readonly uploadResult = signal<ElementosCargaResponse | null>(null);
  readonly submissionMessage = signal('');

  readonly csvColumns = [
    'serial',
    'placa',
    'tipo',
    'ubicacion',
    'fabricante',
    'modelo',
    'estado',
    'adendo',
    'fechaActualizacion',
    'fechaAsignacion',
    'responsable',
    'memoria',
    'disco',
    'ipCableada',
    'macCableada',
    'ipInalambrica',
    'macInalambrica',
    'teclado',
    'mause',
    'propietario',
    'hostname',
    'observacion',
    'user_id',
    'tienda_id',
  ];

  readonly perifericoOptions = ['Si', 'No', 'N/A'];

  readonly contablesForm = this.fb.group({
    serial: ['', Validators.required],
    placa: ['', Validators.required],
    tipo: ['', Validators.required],
    ubicacion: ['', Validators.required],
    fabricante: ['', Validators.required],
    modelo: ['', Validators.required],
    estado: ['Disponible', Validators.required],
    adendo: [''],
    fechaActualizacion: [this.getTodayInputValue(), Validators.required],
    fechaAsignacion: [this.getTodayInputValue(), Validators.required],
    responsable: [''],
    propietario: ['Sodimac'],
    observacion: [''],
    user_id: [null as number | null],
    tienda_id: [this.userStoreId, Validators.required],
  });

  readonly tecnicosForm = this.fb.group({
    memoria: [''],
    disco: [''],
    ipCableada: [''],
    macCableada: [''],
    ipInalambrica: [''],
    macInalambrica: [''],
    teclado: [''],
    mouse: [''],
    hostname: [''],
  });

  readonly massiveForm = this.fb.group({
    file: [null as File | null, Validators.required],
  });

  ngOnInit(): void {
    this.loadStores();
  }

  cambiarModo(mode: CargueMode): void {
    if (this.mode() === mode) {
      return;
    }

    this.mode.set(mode);
    this.uploadResult.set(null);
    this.submissionMessage.set('');
    if (mode === 'individual' && this.individualStepper) {
      this.individualStepper.selectedIndex = 0;
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0] ?? null;

    this.massiveForm.patchValue({ file });
    this.massiveForm.get('file')?.markAsTouched();
    this.selectedFileName.set(file?.name ?? '');
  }

  clearSelectedFile(): void {
    this.massiveForm.reset({ file: null });
    this.selectedFileName.set('');

    if (this.csvInput?.nativeElement) {
      this.csvInput.nativeElement.value = '';
    }
  }

  onSubmitIndividual(): void {
    if (this.contablesForm.invalid || this.tecnicosForm.invalid) {
      this.contablesForm.markAllAsTouched();
      this.tecnicosForm.markAllAsTouched();
      this.notifications.error('Completa los campos obligatorios del formulario individual.');
      return;
    }

    this.isSubmitting.set(true);
    const payload = this.buildIndividualPayload();

    this.inventarioService.cargarElemento(payload).subscribe({
      next: (result) => {
        this.uploadResult.set(result);
        this.submissionMessage.set(this.buildSuccessMessage(result));
        this.notifications.success('Elemento cargado correctamente.');
        this.resetIndividualForm();
      },
      error: (error) => {
        const message = this.extractErrorMessage(
          error,
          'No se pudo registrar el elemento individual.'
        );
        this.notifications.error(message);
        this.submissionMessage.set(message);
        this.isSubmitting.set(false);
      },
      complete: () => {
        this.isSubmitting.set(false);
      },
    });
  }

  onSubmitMassive(): void {
    const file = this.massiveForm.get('file')?.value;

    if (!(file instanceof File)) {
      this.massiveForm.markAllAsTouched();
      this.notifications.error('Selecciona un archivo CSV antes de enviarlo.');
      return;
    }

    this.isSubmitting.set(true);
    this.inventarioService.cargarArchivoCsv(file).subscribe({
      next: (result) => {
        this.uploadResult.set(result);
        this.submissionMessage.set(this.buildSuccessMessage(result));
        this.notifications.success('Archivo CSV enviado correctamente.');
        this.clearSelectedFile();
      },
      error: (error) => {
        const message = this.extractErrorMessage(error, 'No se pudo cargar el archivo CSV.');
        this.notifications.error(message);
        this.submissionMessage.set(message);
        this.isSubmitting.set(false);
      },
      complete: () => {
        this.isSubmitting.set(false);
      },
    });
  }

  showContableError(controlName: keyof typeof this.contablesForm.controls): boolean {
    const control = this.contablesForm.controls[controlName];
    return Boolean(control && control.invalid && (control.touched || control.dirty));
  }

  showTecnicoError(controlName: keyof typeof this.tecnicosForm.controls): boolean {
    const control = this.tecnicosForm.controls[controlName];
    return Boolean(control && control.invalid && (control.touched || control.dirty));
  }

  showMassiveError(controlName: keyof typeof this.massiveForm.controls): boolean {
    const control = this.massiveForm.controls[controlName];
    return Boolean(control && control.invalid && (control.touched || control.dirty));
  }

  getSummaryValue(result: ElementosCargaResponse, key: string): number {
    const value = result.summary[key];
    return typeof value === 'number' && Number.isFinite(value) ? value : 0;
  }

  getContablesSummaryItems(): Array<{ label: string; value: string }> {
    const raw = this.contablesForm.getRawValue();

    return [
      { label: 'Serial', value: this.formatSummaryValue(raw.serial) },
      { label: 'Placa', value: this.formatSummaryValue(raw.placa) },
      { label: 'Tipo', value: this.formatSummaryValue(raw.tipo) },
      { label: 'Ubicación', value: this.formatSummaryValue(raw.ubicacion) },
      { label: 'Fabricante', value: this.formatSummaryValue(raw.fabricante) },
      { label: 'Modelo', value: this.formatSummaryValue(raw.modelo) },
      { label: 'Estado', value: this.formatSummaryValue(raw.estado) },
      { label: 'Adendo', value: this.formatSummaryValue(raw.adendo) },
      { label: 'Fecha actualización', value: this.formatSummaryValue(this.formatDateForApi(raw.fechaActualizacion)) },
      { label: 'Fecha asignación', value: this.formatSummaryValue(this.formatDateForApi(raw.fechaAsignacion)) },
      { label: 'Responsable', value: this.formatSummaryValue(raw.responsable) },
      { label: 'Propietario', value: this.formatSummaryValue(raw.propietario) },
      { label: 'User ID', value: this.formatSummaryValue(raw.user_id) },
      { label: 'Tienda', value: this.getStoreSummaryValue(raw.tienda_id) },
      { label: 'Observación', value: this.formatSummaryValue(raw.observacion) },
    ];
  }

  getTecnicosSummaryItems(): Array<{ label: string; value: string }> {
    const raw = this.tecnicosForm.getRawValue();

    return [
      { label: 'Hostname', value: this.formatSummaryValue(raw.hostname) },
      { label: 'Memoria', value: this.formatSummaryValue(raw.memoria) },
      { label: 'Disco', value: this.formatSummaryValue(raw.disco) },
      { label: 'IP cableada', value: this.formatSummaryValue(raw.ipCableada) },
      { label: 'MAC cableada', value: this.formatSummaryValue(raw.macCableada) },
      { label: 'IP inalámbrica', value: this.formatSummaryValue(raw.ipInalambrica) },
      { label: 'MAC inalámbrica', value: this.formatSummaryValue(raw.macInalambrica) },
      { label: 'Teclado', value: this.formatSummaryValue(raw.teclado) },
      { label: 'Mouse / Mause', value: this.formatSummaryValue(raw.mouse) },
    ];
  }

  private loadStores(): void {
    this.tiendaEstadoService.getTienda().subscribe({
      next: (stores) => {
        const normalizedStores = this.normalizeStores(stores);
        this.stores.set(normalizedStores);
        this.prefillUserStore(normalizedStores);
        this.isLoadingStores.set(false);
      },
      error: () => {
        this.isLoadingStores.set(false);
        this.notifications.error('No se pudieron cargar las tiendas para el formulario.');
      },
    });
  }

  private prefillUserStore(stores: TiendaModel[]): void {
    if (this.userStoreId === null) {
      return;
    }

    const userStoreExists = stores.some((store) => store.id === this.userStoreId);
    if (userStoreExists) {
      this.contablesForm.patchValue({ tienda_id: this.userStoreId });
    }
  }

  private normalizeStores(stores: TiendaModel[]): TiendaModel[] {
    const normalized = new Map<number, TiendaModel>();

    stores.forEach((store) => {
      const rawId = (store as Partial<TiendaModel> & { tienda_id?: unknown }).id ?? (store as any).tienda_id;
      const id = Number(rawId);
      const nombre = typeof store.nombre === 'string' ? store.nombre.trim() : '';

      if (!Number.isFinite(id) || id <= 0 || !nombre) {
        return;
      }

      normalized.set(Math.trunc(id), {
        id: Math.trunc(id),
        nombre,
      });
    });

    return Array.from(normalized.values()).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  }

  private buildIndividualPayload(): ElementoCargaPayload {
    const contables = this.contablesForm.getRawValue();
    const tecnicos = this.tecnicosForm.getRawValue();
    const payload: ElementoCargaPayload = {
      serial: this.normalizeRequiredText(contables.serial),
      placa: this.normalizeRequiredText(contables.placa),
      tipo: this.normalizeRequiredText(contables.tipo),
      ubicacion: this.normalizeRequiredText(contables.ubicacion),
      fabricante: this.normalizeRequiredText(contables.fabricante),
      modelo: this.normalizeRequiredText(contables.modelo),
      estado: this.normalizeRequiredText(contables.estado),
      adendo: this.normalizeOptionalText(contables.adendo),
      fechaActualizacion: this.formatDateForApi(contables.fechaActualizacion),
      fechaAsignacion: this.formatDateForApi(contables.fechaAsignacion),
      responsable: this.normalizeOptionalText(contables.responsable),
      memoria: this.normalizeOptionalText(tecnicos.memoria),
      disco: this.normalizeOptionalText(tecnicos.disco),
      ipCableada: this.normalizeOptionalText(tecnicos.ipCableada),
      macCableada: this.normalizeOptionalText(tecnicos.macCableada),
      ipInalambrica: this.normalizeOptionalText(tecnicos.ipInalambrica),
      macInalambrica: this.normalizeOptionalText(tecnicos.macInalambrica),
      ip_cableada: this.normalizeOptionalText(tecnicos.ipCableada),
      mac_cableada: this.normalizeOptionalText(tecnicos.macCableada),
      ip_inalambrica: this.normalizeOptionalText(tecnicos.ipInalambrica),
      mac_inalambrica: this.normalizeOptionalText(tecnicos.macInalambrica),
      teclado: this.normalizeOptionalText(tecnicos.teclado),
      mouse: this.normalizeOptionalText(tecnicos.mouse),
      mause: this.normalizeOptionalText(tecnicos.mouse),
      propietario: this.normalizeOptionalText(contables.propietario),
      hostname: this.normalizeOptionalText(tecnicos.hostname),
      observacion: this.normalizeOptionalText(contables.observacion),
      user_id: this.normalizePositiveNumber(contables.user_id),
      tienda_id: this.normalizePositiveNumber(contables.tienda_id),
    };

    return this.compactPayload(payload) as ElementoCargaPayload;
  }

  private compactPayload<T extends object>(payload: T): Partial<T> {
    return Object.entries(payload as Record<string, unknown>).reduce<Record<string, unknown>>(
      (accumulator, [key, value]) => {
      if (value !== undefined && value !== null) {
        accumulator[key] = value;
      }
      return accumulator;
      },
      {}
    ) as Partial<T>;
  }

  resetIndividualForm(): void {
    this.contablesForm.reset({
      serial: '',
      placa: '',
      tipo: '',
      ubicacion: '',
      fabricante: '',
      modelo: '',
      estado: 'Disponible',
      adendo: '',
      fechaActualizacion: this.getTodayInputValue(),
      fechaAsignacion: this.getTodayInputValue(),
      responsable: '',
      propietario: 'Sodimac',
      observacion: '',
      user_id: null,
      tienda_id: this.userStoreId,
    });

    this.tecnicosForm.reset({
      memoria: '',
      disco: '',
      ipCableada: '',
      macCableada: '',
      ipInalambrica: '',
      macInalambrica: '',
      teclado: '',
      mouse: '',
      hostname: '',
    });

    if (this.individualStepper) {
      this.individualStepper.selectedIndex = 0;
    }
  }

  private buildSuccessMessage(result: ElementosCargaResponse): string {
    const inserted = this.getSummaryValue(result, 'inserted');
    const updated = this.getSummaryValue(result, 'updated');
    const skipped = this.getSummaryValue(result, 'skipped');

    return `${result.processedRows} fila(s) procesadas, ${inserted} insertadas, ${updated} actualizadas${skipped > 0 ? `, ${skipped} omitidas` : ''}.`;
  }

  private extractErrorMessage(error: unknown, fallback: string): string {
    const candidate = error as {
      error?: unknown;
      message?: unknown;
    };

    if (typeof candidate.error === 'string' && candidate.error.trim()) {
      return candidate.error.trim();
    }

    if (candidate.error && typeof candidate.error === 'object') {
      const record = candidate.error as Record<string, unknown>;
      if (typeof record['message'] === 'string' && record['message'].trim()) {
        return record['message'].trim();
      }

      const errors = record['errors'];
      if (Array.isArray(errors)) {
        const firstError = errors.find(
          (value): value is string => typeof value === 'string' && value.trim().length > 0
        );
        if (firstError) {
          return firstError.trim();
        }
      }
    }

    if (typeof candidate.message === 'string' && candidate.message.trim()) {
      return candidate.message.trim();
    }

    return fallback;
  }

  private normalizeRequiredText(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
  }

  private normalizeOptionalText(value: unknown): string | undefined {
    if (typeof value !== 'string') {
      return undefined;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  private normalizePositiveNumber(value: unknown): number | undefined {
    if (value === null || value === undefined || value === '') {
      return undefined;
    }

    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return undefined;
    }

    return Math.trunc(parsed);
  }

  private getStoreSummaryValue(value: unknown): string {
    const storeId = this.normalizePositiveNumber(value);
    if (storeId === undefined) {
      return 'Sin dato';
    }

    const store = this.stores().find((item) => item.id === storeId);
    return store ? `${store.id} - ${store.nombre}` : String(storeId);
  }

  private formatSummaryValue(value: unknown): string {
    if (value === null || value === undefined || value === '') {
      return 'Sin dato';
    }

    return String(value);
  }

  private formatDateForApi(value: unknown): string | undefined {
    if (typeof value !== 'string') {
      return undefined;
    }

    const trimmed = value.trim();
    if (!trimmed) {
      return undefined;
    }

    if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
      return trimmed;
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const [year, month, day] = trimmed.split('-');
      return `${day}/${month}/${year}`;
    }

    return trimmed;
  }

  private getTodayInputValue(): string {
    const today = new Date();
    const timezoneOffsetMs = today.getTimezoneOffset() * 60_000;
    return new Date(today.getTime() - timezoneOffsetMs).toISOString().slice(0, 10);
  }
}
