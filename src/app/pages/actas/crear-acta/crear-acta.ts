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
        }
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

    // Bloquear el campo contrario para evitar conflictos
    if (campoTrigger === 'serial') {
      this.activosForm.get('placa')?.disable({ emitEvent: false });
      this.activosForm.get('serial')?.enable({ emitEvent: false });
    } else {
      this.activosForm.get('serial')?.disable({ emitEvent: false });
      this.activosForm.get('placa')?.enable({ emitEvent: false });
    }
  }

  guardarActivoYContinuar() {
    if (this.activosForm.invalid) return;

    // Usamos update en el signal
    this.activosAgregados.update(prev => [...prev, this.activosForm.getRawValue()]);

    if (this.activosAgregados().length === 1) {
      this.responsableForm.disable();
    }

    this.guardarBorrador();
    this.stepper.next();
  }

  agregarElemento() {
    this.activosForm.reset();
    this.activosForm.enable();
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

    this.actasService.notificarActa(payload).subscribe({
      next: () => {
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
}
