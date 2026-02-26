import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { ActasService } from './../../../core/services/actas.service';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-aprobar',
  imports: [],
  templateUrl: './aprobar.html',
  styleUrl: './aprobar.scss',
})
export class Aprobar implements OnInit {
  private readonly respuestasPermitidas = new Set(['aprobado', 'rechazado']);

  estado: 'cargando' | 'exito' | 'error' = 'cargando';
  mensaje = '';
  res: string | null = null;
  tokenActual: string | null = null;
  mostrarReactivarPorToken = false;
  reactivandoToken = false;

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
    this.tokenActual = token;
    this.mostrarReactivarPorToken = false;

    if (
      !token ||
      !respuesta ||
      token.length > 2048 ||
      !this.respuestasPermitidas.has(respuesta)
    ) {
      this.estado = 'error';
      this.mensaje = 'Enlace inválido o incompleto';
      this.notifications.error(this.mensaje);
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
        this.estado = 'error';

        if (err?.error?.estado === 'invalido') {
          this.mensaje =
            'Token inválido o ya utilizado. Verifica el enlace.';
          this.mostrarReactivarPorToken = false;
          this.notifications.error(this.mensaje);
          return;
        }

        if (this.puedeReactivarConToken(err)) {
          this.mensaje =
            err?.error?.message ||
            'El enlace expiró. Puedes solicitar el reenvío con un nuevo vencimiento.';
          this.mostrarReactivarPorToken = true;
          this.notifications.info(this.mensaje);
          return;
        }

        this.mensaje =
          err?.error?.message ||
          err?.message ||
          'Ocurrió un error al procesar la asignación.';
        this.mostrarReactivarPorToken = false;
        this.notifications.error(this.mensaje);
        this.cdr.detectChanges();
      }
    });
  }

  solicitarReactivacionPorToken(): void {
    if (!this.tokenActual || this.reactivandoToken) {
      return;
    }

    this.reactivandoToken = true;
    this.actasService.reactivarAsignacionPorToken(this.tokenActual).subscribe({
      next: (res: any) => {
        this.estado = 'exito';
        this.mensaje = res?.message || 'Solicitud reenviada. Revisa tu correo para aprobar con el nuevo enlace.';
        this.mostrarReactivarPorToken = false;
        this.reactivandoToken = false;
        this.notifications.success(this.mensaje);
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.estado = 'error';
        this.mensaje =
          err?.error?.message ||
          err?.message ||
          'No se pudo solicitar un nuevo enlace.';
        this.reactivandoToken = false;
        this.notifications.error(this.mensaje);
        this.cdr.detectChanges();
      }
    });
  }

  private puedeReactivarConToken(err: any): boolean {
    if (!this.tokenActual) {
      return false;
    }

    const estado = String(err?.error?.estado ?? '').toLowerCase();
    const message = String(err?.error?.message ?? err?.message ?? '').toLowerCase();
    return estado === 'expirado' || message.includes('expirad');
  }

}
