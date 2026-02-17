import { Component, OnInit, OnDestroy, ViewChild, signal, inject } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { switchMap, catchError, debounceTime, distinctUntilChanged, filter, takeUntil } from 'rxjs/operators';
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

@Component({
  standalone: true,
  selector: 'app-crear-acta',
  templateUrl: './crear-acta.html',
  styleUrls: ['./crear-acta.scss'],
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

  // Signals para reactividad inmediata
  activosAgregados = signal<any[]>([]);
  tiendas = signal<any[]>([]);
  estados = this.tiendaEstadoService.estados;
  private destroy$ = new Subject<void>();

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
    this.cargarInventario();
    this.setupListeners();
    this.recuperarBorrador();
  }

  cargarListas() {
    this.tiendaEstadoService.getTienda().subscribe({
      next: (data) => this.tiendas.set(data),
      error: (err) => console.error('Error cargando tiendas:', err)
    });
  }

  cargarInventario() {
    this.inventarioService.getInventario().subscribe({
      next: data => this.tiendaEstadoService.inventario.set(data),
      error: err => console.error('❌ Error cargando inventario:', err)
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
        debounceTime(500),
        distinctUntilChanged(),
        switchMap(usuario =>
          this.userService.getByUsername(usuario!).pipe(
            catchError(() => of(null)) // Manejo de error, retorna null si falla
          )
        ),
        takeUntil(this.destroy$)
      )
      .subscribe(data => {
        console.log('🔍 Resultado búsqueda usuario:', data);
        if (data) {
          this.responsableForm.patchValue({
            nombre: data.name,
            cedula: String(data.id),
            cargo: data.cargo,
            correo: data.email
          });
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
          console.log(`🔍 Buscando ${campo}:`, valor);
          if (control.disabled) {
            console.warn(`⚠️ Campo ${campo} está deshabilitado`);
            return of(null);
          }
          return this.inventarioService.buscarPorCampo(valor, campo).pipe(
            catchError((err) => {
              console.error(`❌ Error buscando ${campo} "${valor}":`, err);
              console.error('Status:', err.status);
              console.error('URL esperada:', `/elementos/${campo}/${valor}`);
              return of(null);
            })
          );
        }),
        takeUntil(this.destroy$)
      )
      .subscribe(
        activo => {
          if (activo) {
            console.log(`✅ Resultado encontrado para ${campo}:`, activo);
            this.autocompletarActivo(activo, campo);
          } else {
            console.warn(`⚠️ No se encontró resultado para ${campo}`);
          }
        },
        err => console.error('Error en subscribe:', err)
      );
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

    console.log('📤 Enviando acta con payload:', payload);

    this.actasService.notificarActa(payload).subscribe({
      next: (res) => {
        console.log('✅ Acta enviada:', res);
        this.resetFormulario();
      },
      error: (err) => {
        console.error('❌ Error enviando acta:', err);
      }
    });
  }

  private resetFormulario() {
    localStorage.removeItem('acta_borrador');
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
    localStorage.setItem('acta_borrador', JSON.stringify(borrador));
  }

  recuperarBorrador() {
    const data = localStorage.getItem('acta_borrador');
    if (!data) return;

    const borrador = JSON.parse(data);
    this.responsableForm.patchValue(borrador.responsable);
    this.ubicacionForm.patchValue(borrador.ubicacion);
    this.activosAgregados.set(borrador.activos || []);

    if (this.activosAgregados().length > 0) this.responsableForm.disable();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
