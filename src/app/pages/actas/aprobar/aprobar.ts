import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { ActasService } from './../../../core/services/actas.service';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-aprobar',
  imports: [],
  templateUrl: './aprobar.html',
})
export class Aprobar implements OnInit {
  private readonly respuestasPermitidas = new Set(['aprobado', 'rechazado']);

  estado: 'cargando' | 'exito' | 'error' = 'cargando';
  mensaje = '';
  res: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
    private actasService: ActasService,
    private notifications: NotificationService
  ) { }

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token');
    const respuesta = this.route.snapshot.queryParamMap.get('respuesta')?.toLowerCase() ?? null;

    this.res = respuesta;

    if (
      !token ||
      !respuesta ||
      token.length > 2048 ||
      !this.respuestasPermitidas.has(respuesta)
    ) {
      this.mostrarError('Enlace inválido o incompleto');
      return;
    }

    this.actasService.confirmarAsignacion(token, respuesta, true).subscribe({
      next: (res: any) => {
        this.estado = 'exito';
        this.mensaje = res?.message || res?.error?.message || 'Asignación procesada';
        this.notifications.success(this.mensaje);
        this.cdr.detectChanges();
      },
      error: (err) => {
        if (err?.error?.estado === 'invalido') {
          this.mostrarError('Token inválido o ya utilizado. Verifica el enlace.');
          return;
        }

        if (this.puedeReactivarConToken(err)) {
          this.mostrarError(
            err?.error?.message ||
            'El enlace expiró. Solicita a un analista la reactivación de la asignación.'
          );
          return;
        }

        this.mostrarError(
          err?.error?.message ||
          err?.message ||
          'Ocurrió un error al procesar la asignación.'
        );
      }
    });
  }

  private puedeReactivarConToken(err: any): boolean {
    const estado = String(err?.error?.estado ?? '').toLowerCase();
    const message = String(err?.error?.message ?? err?.message ?? '').toLowerCase();
    return estado === 'expirado' || message.includes('expirad');
  }

  private mostrarError(mensaje: string): void {
    this.estado = 'error';
    this.mensaje = mensaje;
    this.notifications.error(this.mensaje);
    this.cdr.detectChanges();
  }

}
