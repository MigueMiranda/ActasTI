import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { ActasService } from './../../../core/services/actas.service';

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

  constructor(
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
    private actasService: ActasService
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
      this.estado = 'error';
      this.mensaje = 'Enlace inválido o incompleto';
      return;
    }

    this.actasService.confirmarAsignacion(token, respuesta, true).subscribe({
      next: (res: any) => {
        this.estado = 'exito';
        this.mensaje = res?.message || res?.error?.message || 'Asignación procesada';
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.estado = 'error';

        if (err?.error?.estado === 'invalido') {
          this.mensaje =
            'Token inválido o ya utilizado. Verifica el enlace.';
          return;
        }

        this.mensaje =
          err?.error?.message ||
          err?.message ||
          'Ocurrió un error al procesar la asignación.';
        this.cdr.detectChanges();
      }
    });
  }

}
