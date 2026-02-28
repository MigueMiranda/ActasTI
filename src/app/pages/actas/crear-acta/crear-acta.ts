import { Component, OnInit, OnDestroy, ViewChild, signal, inject } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { switchMap, catchError, debounceTime, distinctUntilChanged, filter, map, takeUntil, tap } from 'rxjs/operators';
import { MatStepper, MatStepperModule } from '@angular/material/stepper';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { of, Subject } from 'rxjs'
import { FormControl } from '@angular/forms';

import { UserService } from '../../../core/services/user.service';
import { InventarioService } from '../../../core/services/inventario.service';
import { TiendaEstadoService } from '../../../core/services/tienda-estado.service';
import { ActasService } from '../../../core/services/actas.service';
import { Dialog } from '../../../components/dialog/dialog';
import { NotificationService } from '../../../core/services/notification.service';
import { DatosTecnicosDialogComponent, DatosTecnicosFormValue } from '../../../components/datos-tecnicos-dialog/datos-tecnicos-dialog';

@Component({
  standalone: true,
  selector: 'app-crear-acta',
  templateUrl: './crear-acta.html',
  imports: [
    ReactiveFormsModule,
    MatStepperModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCardModule,
    MatSelectModule
  ]
})
export class CrearActaComponent implements OnInit, OnDestroy {
  @ViewChild('stepper') stepper!: MatStepper;

  private fb = inject(FormBuilder);
  private dialog = inject(MatDialog);
  private userService = inject(UserService);
  private inventarioService = inject(InventarioService);
  private tiendaEstadoService = inject(TiendaEstadoService);
  private actasService = inject(ActasService);
  private notifications = inject(NotificationService);

  // Signals para reactividad inmediata
  activosAgregados = signal<any[]>([]);
  tiendas = signal<any[]>([]);
  estados = this.tiendaEstadoService.estados;
  datosTecnicosActivo = signal<DatosTecnicosFormValue>(this.buildEmptyDatosTecnicos());
  private destroy$ = new Subject<void>();
  private readonly draftKey = 'acta_borrador';

  responsableForm = this.fb.group({
    usuario: ['', Validators.required],
    cedula: [{ value: '', disabled: true }, Validators.required],
    nombre: [{ value: '', disabled: true }, Validators.required],
    cargo: [{ value: '', disabled: true }, Validators.required],
    correo: [{ value: '', disabled: true }, Validators.required],
  });

  activosForm = this.fb.group({
    serial: ['', Validators.required],
    placa: ['', Validators.required],
    tipo: [{ value: '', disabled: true }, Validators.required],
    marca: [{ value: '', disabled: true }, Validators.required],
    modelo: [{ value: '', disabled: true }, Validators.required],
  });

  ubicacionForm = this.fb.group({
    tiendaId: [null, Validators.required],
    estado: ['', Validators.required],
    ubicacion: ['', Validators.required],
  });

  ngOnInit() {
    this.cargarListas();
    this.setupListeners();
    this.recuperarBorrador();
  }

  cargarListas() {
    this.tiendaEstadoService.getTienda().subscribe({
      next: (data) => this.tiendas.set(data),
      error: (err) => {
        console.error('Error cargando tiendas:', err);
        this.notifications.error('No se pudieron cargar las tiendas');
      }
    });
  }

  get nombreTiendaSeleccionada(): string {
    const tiendaId = this.ubicacionForm.get('tiendaId')?.value;
    if (!tiendaId) return '';

    return this.tiendas().find(t => t.id === tiendaId)?.nombre ?? '';
  }

  setupListeners() {
    // Busqueda Responsable
    this.responsableForm.get('usuario')?.valueChanges
      .pipe(
        filter((value): value is string => typeof value === 'string'),
        map((value) => value.trim()),
        debounceTime(500),
        distinctUntilChanged(),
        tap((usuario) => {
          if (usuario.length < 3) {
            this.limpiarDatosResponsable();
          }
        }),
        filter((usuario) => usuario.length >= 3),
        switchMap((usuario) =>
          this.userService.getByUsername(usuario).pipe(
            catchError((err) => {
              if (err?.status && err.status !== 404) {
                console.warn(`No se pudo consultar usuario (${err.status}).`);
              }
              return of(null);
            })
          )
        ),
        takeUntil(this.destroy$)
      )
      .subscribe(data => {
        if (data) {
          this.responsableForm.patchValue({
            nombre: data.name,
            cedula: String(data.id),
            cargo: data.cargo,
            correo: data.email
          });
        } else {
          this.limpiarDatosResponsable();
        }
      });

    // Busqueda Activos (Serial y Placa)
    this.escucharCampoActivo('serial');
    this.escucharCampoActivo('placa');
  }

  escucharCampoActivo(campo: 'serial' | 'placa') {
    const control = this.activosForm.get(campo) as FormControl | null;
    if (!control) return;

    control.valueChanges
      .pipe(
        filter((val): val is string => typeof val === 'string' && val.length > 3),
        debounceTime(400),
        distinctUntilChanged(),
        switchMap((valor: string) => {
          if (control.disabled) {
            return of(null);
          }
          return this.inventarioService.buscarPorCampo(valor, campo).pipe(
            catchError(() => of(null))
          );
        }),
        takeUntil(this.destroy$)
      )
      .subscribe((activo) => {
        if (activo) {
          this.autocompletarActivo(activo, campo);
          return;
        }
        this.limpiarDatosTecnicosActivo();
      });
  }




  autocompletarActivo(activo: any, campoTrigger: string) {
    this.activosForm.patchValue({
      tipo: activo.tipo,
      marca: activo.fabricante,
      modelo: activo.modelo,
      serial: activo.serial,
      placa: activo.placa
    }, { emitEvent: false });
    this.datosTecnicosActivo.set(this.extraerDatosTecnicos(activo));

    // Bloquear el campo contrario para evitar conflictos
    if (campoTrigger === 'serial') {
      this.activosForm.get('placa')?.disable({ emitEvent: false });
      this.activosForm.get('serial')?.enable({ emitEvent: false });
    } else {
      this.activosForm.get('serial')?.disable({ emitEvent: false });
      this.activosForm.get('placa')?.enable({ emitEvent: false });
    }
  }

  abrirDatosTecnicos(): void {
    const dialogRef = this.dialog.open(DatosTecnicosDialogComponent, {
      width: '820px',
      maxWidth: '95vw',
      panelClass: 'datos-tecnicos-dialog',
      data: this.datosTecnicosActivo(),
    });

    dialogRef.afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe((result) => {
        if (!result) {
          return;
        }
        this.datosTecnicosActivo.set(this.normalizarDatosTecnicos(result));
      });
  }

  guardarActivoYContinuar() {
    if (this.activosForm.invalid) return;

    // Usamos update en el signal
    this.activosAgregados.update(prev => [...prev, this.construirActivoConDatosTecnicos()]);

    if (this.activosAgregados().length === 1) {
      this.responsableForm.disable();
    }

    this.guardarBorrador();
    this.stepper.next();
  }

  agregarElemento() {
    this.activosForm.reset();
    this.activosForm.enable();
    this.limpiarDatosTecnicosActivo();
    this.stepper.selectedIndex = 1; // Volver al paso de activos
  }

  confirmarGenerarActa() {
    const dialogRef = this.dialog.open(Dialog, {
      width: '400px',
      data: { mensaje: `Se generara acta con ${this.activosAgregados().length} activos` }
    });

    dialogRef.afterClosed().subscribe(res => {
      if (res) this.crearActaFinal();
    });
  }

  crearActaFinal() {
    const payload = {
      responsable: this.responsableForm.getRawValue(),
      activos: this.activosAgregados(),
      ubicacion: this.ubicacionForm.value
    };
    const serialesMovimiento = this.extraerSeriales(payload.activos);

    this.actasService.notificarActa(payload).subscribe({
      next: () => {
        this.tiendaEstadoService.refrescarActivosPorSerial(serialesMovimiento);
        this.notifications.success('Acta creada correctamente');
        this.resetFormulario();
      },
      error: (err) => {
        console.error('Error enviando acta:', err);
        const msg =
          err?.error?.message
          || err?.error?.error
          || 'No se pudo crear el acta. Inténtalo nuevamente.';
        this.notifications.error(msg);
      }
    });
  }

  private limpiarDatosResponsable() {
    this.responsableForm.patchValue({
      cedula: '',
      nombre: '',
      cargo: '',
      correo: ''
    }, { emitEvent: false });
  }

  private resetFormulario() {
    localStorage.removeItem(this.draftKey);
    this.stepper.reset();
    this.activosAgregados.set([]);
    this.responsableForm.enable();
    this.activosForm.enable();
    this.limpiarDatosTecnicosActivo();
  }

  cancelarActa() {
    const dialogRef = this.dialog.open(Dialog, {
      width: '400px',
      data: { mensaje: '¿Estás seguro de cancelar la creación del acta? Se perderán los datos ingresados.' }
    });

    dialogRef.afterClosed().subscribe(res => {
      if (res) {
        this.resetFormulario();
      }
    });
  }

  guardarBorrador() {
    const borrador = {
      responsable: this.responsableForm.getRawValue(),
      activos: this.activosAgregados(),
      ubicacion: this.ubicacionForm.value
    };
    localStorage.setItem(this.draftKey, JSON.stringify(borrador));
  }

  recuperarBorrador() {
    const data = localStorage.getItem(this.draftKey);
    if (!data) return;

    try {
      const borrador = JSON.parse(data) as {
        responsable?: Record<string, unknown>;
        activos?: unknown[];
        ubicacion?: Record<string, unknown>;
      };

      if (!borrador || typeof borrador !== 'object') {
        localStorage.removeItem(this.draftKey);
        return;
      }

      this.responsableForm.patchValue(borrador.responsable ?? {});
      this.ubicacionForm.patchValue(borrador.ubicacion ?? {});
      this.activosAgregados.set(Array.isArray(borrador.activos) ? borrador.activos : []);

      if (this.activosAgregados().length > 0) this.responsableForm.disable();
    } catch {
      localStorage.removeItem(this.draftKey);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private construirActivoConDatosTecnicos(): Record<string, unknown> {
    const base = this.activosForm.getRawValue();
    const datos = this.normalizarDatosTecnicos(this.datosTecnicosActivo());

    return {
      ...base,
      ...datos,
      ip_cableada: datos.ipCableada,
      mac_cableada: datos.macCableada,
      ip_inalambrica: datos.ipInalambrica,
      mac_inalambrica: datos.macInalambrica,
    };
  }

  private extraerDatosTecnicos(activo: Record<string, unknown>): DatosTecnicosFormValue {
    return this.normalizarDatosTecnicos({
      hostname: this.readString(activo['hostname']),
      ipCableada: this.readString(activo['ipCableada'], activo['ip_cableada']),
      macCableada: this.readString(activo['macCableada'], activo['mac_cableada']),
      ipInalambrica: this.readString(activo['ipInalambrica'], activo['ip_inalambrica']),
      macInalambrica: this.readString(activo['macInalambrica'], activo['mac_inalambrica']),
      disco: this.readString(activo['disco'], activo['capacidadDisco'], activo['capacidad_disco']),
      memoria: this.readString(activo['memoria']),
      mouse: this.readChoice(activo['mouse'], activo['mause']),
      teclado: this.readChoice(activo['teclado']),
    });
  }

  private normalizarDatosTecnicos(value: Partial<DatosTecnicosFormValue>): DatosTecnicosFormValue {
    return {
      hostname: this.readString(value.hostname) ?? '',
      ipCableada: this.readString(value.ipCableada) ?? '',
      macCableada: this.readString(value.macCableada) ?? '',
      ipInalambrica: this.readString(value.ipInalambrica) ?? '',
      macInalambrica: this.readString(value.macInalambrica) ?? '',
      disco: this.readString(value.disco) ?? '',
      memoria: this.readString(value.memoria) ?? '',
      mouse: this.readChoice(value.mouse),
      teclado: this.readChoice(value.teclado),
    };
  }

  private buildEmptyDatosTecnicos(): DatosTecnicosFormValue {
    return {
      hostname: '',
      ipCableada: '',
      macCableada: '',
      ipInalambrica: '',
      macInalambrica: '',
      disco: '',
      memoria: '',
      mouse: '',
      teclado: '',
    };
  }

  private limpiarDatosTecnicosActivo(): void {
    this.datosTecnicosActivo.set(this.buildEmptyDatosTecnicos());
  }

  private readString(...values: unknown[]): string | undefined {
    for (const value of values) {
      if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed.length > 0) {
          return trimmed;
        }
      }
      if (typeof value === 'number' && Number.isFinite(value)) {
        return String(value);
      }
    }
    return undefined;
  }

  private readChoice(...values: unknown[]): 'Si' | 'No' | '' {
    for (const value of values) {
      if (typeof value === 'boolean') {
        return value ? 'Si' : 'No';
      }

      if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        if (normalized === 'si' || normalized === 's' || normalized === 'true' || normalized === '1') {
          return 'Si';
        }
        if (normalized === 'no' || normalized === 'n' || normalized === 'false' || normalized === '0') {
          return 'No';
        }
      }
    }
    return '';
  }

  private extraerSeriales(activos: unknown[]): string[] {
    if (!Array.isArray(activos)) {
      return [];
    }

    return activos
      .map((item) => {
        if (!item || typeof item !== 'object') {
          return '';
        }
        const serial = (item as Record<string, unknown>)['serial'];
        return typeof serial === 'string' ? serial.trim() : '';
      })
      .filter((serial) => serial.length > 0);
  }
}
