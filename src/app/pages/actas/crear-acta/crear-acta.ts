import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatStepperModule } from '@angular/material/stepper';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { MatCardModule } from '@angular/material/card';
import { ReactiveFormsModule } from '@angular/forms';
import { ViewChild } from '@angular/core';
import { MatStepper } from '@angular/material/stepper';
import { MatDialog } from '@angular/material/dialog';
import { Dialog } from '../../../components/dialog/dialog';
import { MatSelectModule } from '@angular/material/select';


import { UserService } from '../../../core/services/user.service';
import { InventarioService } from '../../../core/services/inventario.service';
import { TiendaEstadoService } from '../../../core/services/tienda-estado.service';
import { TiendaModel, EstadoModel } from '../../../core/models/tienda-estado.model';



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
    MatListModule,
    MatCardModule,
    MatSelectModule
  ]
})
export class CrearActaComponent {
  @ViewChild('stepper') stepper!: MatStepper;

  responsableForm: FormGroup;
  activosForm: FormGroup;
  ubicacionForm: FormGroup;

  activosAgregados: any[] = [];
  tiendas: TiendaModel[] = [];
  estados: EstadoModel[] = []

  constructor(
    private fb: FormBuilder,
    private dialog: MatDialog,
    private userService: UserService,
    private inventarioService: InventarioService,
    private tiendaEstadoService: TiendaEstadoService
  ) {
    this.responsableForm = this.fb.group({
      cedula: [{ value: '', disabled: true }, Validators.required],
      nombre: [{ value: '', disabled: true }, Validators.required],
      cargo: [{ value: '', disabled: true }, Validators.required],
      correo: [{ value: '', disabled: true }, Validators.required],
      usuario: ['', Validators.required],
    });

    this.activosForm = this.fb.group({
      serial: ['', Validators.required],
      placa: ['', Validators.required],
      placaAx: ['', Validators.required],
      tipo: [{ value: '', disabled: true }, Validators.required],
      marca: [{ value: '', disabled: true }, Validators.required],
      modelo: [{ value: '', disabled: true }, Validators.required],
    });

    this.ubicacionForm = this.fb.group({
      tienda: [''],
      estado: [''],
      ubicacion: [''],
    });
  }

  ngOnInit() {
    this.escucharCampo('serial');
    this.escucharCampo('placa');
    this.escucharCampo('placaAx');

    this.responsableForm
      .get('usuario')!
      .valueChanges
      .subscribe(usuario => {
        const dataUsuario = this.buscarResponsable(usuario);

        if (dataUsuario) {
          this.responsableForm.patchValue({
            nombre: dataUsuario.name,
            cedula: dataUsuario.id,
            cargo: dataUsuario.cargo,
            correo: dataUsuario.correo
          },
            { emitEvent: false }
          );
          this.responsableForm.get('nombre')!.disable({ emitEvent: false });
          this.responsableForm.get('cedula')!.disable({ emitEvent: false });
          this.responsableForm.get('cargo')!.disable({ emitEvent: false });
          this.responsableForm.get('correo')!.disable({ emitEvent: false });
        }
      });
    const dataBorrador = localStorage.getItem('acta_borrador');
    if (!dataBorrador) return;

    const borrador = JSON.parse(dataBorrador);

    this.responsableForm.patchValue(borrador.responsable);
    this.ubicacionForm.patchValue({
      tienda: borrador.ubicacion.tienda,
      estado: borrador.ubicacion.estado,
      ubicacion: borrador.ubicacion.ubicacion
    });
    this.activosAgregados = borrador.activos || [];

    if (this.activosAgregados.length > 0) {
      this.responsableForm.disable();
    }

    console.log(this.tiendas = this.tiendaEstadoService.getTienda());
    console.log(this.estados = this.tiendaEstadoService.getEstado());
  }

  buscarResponsable(usuario: string) {
    if (!usuario) {
      this.responsableForm.patchValue({
        nombre: '',
        cedula: '',
        cargo: '',
        correo: ''
      });
      return;
    }

    const responsable = this.userService.getByUsuario(usuario);

    if (responsable) {
      this.responsableForm.patchValue({
        nombre: responsable.name,
        cedula: responsable.id,
        cargo: responsable.cargo,
        correo: responsable.correo
      });
    }

    return responsable;
  }

  escucharCampo(campo: 'serial' | 'placa' | 'placaAx') {
    this.activosForm.get(campo)!
      .valueChanges
      .subscribe(valor => {

        if (!valor || valor.length < 3) return;

        // ⛔ Evitar buscar si el campo está deshabilitado
        if (this.activosForm.get(campo)?.disabled) return;

        const activo = this.inventarioService.buscarPorCampo(valor, campo);
        console.log('Activo encontrado:', activo);

        if (activo) {
          this.cargarActivo(activo, campo);
        }
        return activo;
      });
  }

  resetActivosForm() {
    this.activosForm.reset();

    ['serial', 'placa', 'placaax'].forEach(campo => {
      this.activosForm.get(campo)?.enable({ emitEvent: false });
    });
  }

  cargarActivo(activo: any, campoBuscado: 'serial' | 'placa' | 'placaAx') {
    if (campoBuscado === 'serial') {
      // Autocompletar datos
      this.activosForm.patchValue({
        tipo: activo.tipo,
        marca: activo.marca,
        modelo: activo.modelo,
        placa: activo.placa,
        placaax: activo.placaAx
      },
        { emitEvent: false }
      );
    } else if (campoBuscado === 'placa') {
      // Autocompletar datos
      this.activosForm.patchValue({
        tipo: activo.tipo,
        marca: activo.marca,
        modelo: activo.modelo,
        serial: activo.serial,
        placaax: activo.placaAx
      },
        { emitEvent: false }
      );
    } else {
      // Autocompletar datos
      this.activosForm.patchValue({
        tipo: activo.tipo,
        marca: activo.marca,
        modelo: activo.modelo,
        placa: activo.placa,
        serial: activo.serial
      },
        { emitEvent: false }
      );
    }

    console.log('Activo cargado en el formulario', this.activosForm.value);

    // Habilitar SOLO el campo usado
    ['serial', 'placa', 'placaAx'].forEach(campo => {
      if (campo === campoBuscado) {
        this.activosForm.get(campo)?.enable({ emitEvent: false });
      } else {
        this.activosForm.get(campo)?.disable({ emitEvent: false });
      }
    });
  }



  /** Guarda el activo y avanza a Ubicación */
  guardarActivoYContinuar() {
    if (this.activosForm.invalid) return;

    this.activosAgregados.push({ ...this.activosForm.value });

    // Bloquear responsable solo una vez
    if (this.activosAgregados.length === 1) {
      this.responsableForm.disable();
    }

    this.guardarBorrador();

    console.log('Activo agregado:', this.activosAgregados);
    console.log('Formulario activo:', this.activosForm.value);

    this.stepper.next();
  }

  /** Permite agregar otro activo */
  agregarElemento() {
    this.activosForm.reset();
    this.stepper.selectedIndex = 1;
  }

  confirmarGenerarActa() {
    const dialogRef = this.dialog.open(Dialog, {
      width: '400px',
      data: {
        totalActivos: this.activosAgregados.length
      }
    });

    dialogRef.afterClosed().subscribe(confirmado => {
      if (confirmado) {
        this.crearActa();
      }
    });
  }

  guardarBorrador() {
    const borrador = {
      responsable: this.responsableForm.getRawValue(),
      activos: this.activosAgregados,
      ubicacion: this.ubicacionForm.value
    };

    localStorage.setItem('acta_borrador', JSON.stringify(borrador));
  }

  /** Genera el objeto final del acta */
  crearActa() {
    const actaFinal = {
      responsable: this.responsableForm.getRawValue(),
      activos: this.activosAgregados,
      ubicacion: this.ubicacionForm.value,
    };

    this.activosForm.reset();
    this.responsableForm.reset();
    this.responsableForm.enable();
    this.ubicacionForm.reset();
    this.activosAgregados = [];
    this.stepper.reset();
    localStorage.removeItem('acta_borrador');

    console.log('Acta creada:', actaFinal);
  }
}
