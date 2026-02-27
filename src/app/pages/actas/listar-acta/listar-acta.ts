import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { ActasService } from './../../../core/services/actas.service';
import { CommonModule } from '@angular/common';
import { finalize } from 'rxjs/operators';
import { MatDialog } from '@angular/material/dialog';
import { Dialog } from '../../../components/dialog/dialog';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-listar-acta',
  imports: [
    CommonModule
  ],
  templateUrl: './listar-acta.html',
})
export class ListarActa implements OnInit {
  private dialog = inject(MatDialog);
  private notifications = inject(NotificationService);
  movimientos = signal<any[]>([]);
  paginaActual = signal(1);
  itemsPorPagina = 10;
  reactivandoIds = signal<Set<number>>(new Set<number>());

  // Lógica de ordenamiento y paginación reactiva
  movimientosPaginados = computed(() => {
    // 1. Ordenar de más reciente a antiguo (ID descendente)
    const ordenados = [...this.movimientos()].sort((a, b) => b.id - a.id);

    // 2. Paginar
    const inicio = (this.paginaActual() - 1) * this.itemsPorPagina;
    const fin = inicio + this.itemsPorPagina;
    return ordenados.slice(inicio, fin);
  });


  totalPaginas = computed(() => Math.ceil(this.movimientos().length / this.itemsPorPagina));

  constructor(private actasService: ActasService) { }

  ngOnInit(): void {
    this.cargarMovimientos();
  }

  expandedId: number | null = null;

  toggle(id: number) {
    this.expandedId = this.expandedId === id ? null : id;
  }

  cargarMovimientos() {
    this.actasService.getMovimientos().subscribe({
      next: (data: any[]) => {

        console.log('Movimientos: ', data)

        const formateado = data.map(grupo => ({
          ...grupo[0],
          elemento: grupo
        }));

        this.movimientos.set(formateado);
      }
    });
  }


  cambiarPagina(p: number) {
    if (p >= 1 && p <= this.totalPaginas()) {
      this.paginaActual.set(p);
    }
  }

  verActa(path: string, event?: MouseEvent) {
    event?.stopPropagation();

    const fileName = this.getSafeFileName(path);
    if (!fileName) {
      return;
    }

    const popup = window.open('', '_blank');
    if (popup) {
      popup.document.title = 'Cargando acta...';
      popup.document.body.textContent = 'Cargando acta...';
      try {
        popup.opener = null;
      } catch {
        // No-op: algunos navegadores no permiten sobrescribir opener.
      }
    }

    this.actasService.getActaPdf(fileName).subscribe({
      next: (blob) => {
        if (blob.size === 0) {
          if (popup) {
            popup.document.body.textContent = 'El archivo acta está vacío.';
          }
          return;
        }

        const blobType = blob.type.toLowerCase();
        const looksLikeTextError = blobType.includes('text') || blobType.includes('json');
        if (looksLikeTextError) {
          blob.text().then((text) => {
            if (popup) {
              popup.document.body.textContent = text || 'Respuesta inesperada del servidor al abrir el acta.';
            }
          });
          return;
        }

        const blobUrl = URL.createObjectURL(blob);
        if (popup) {
          popup.location.href = blobUrl;
        } else {
          window.open(blobUrl, '_blank');
        }
        setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
      },
      error: (err) => {
        console.error('No se pudo abrir el acta', err);
        this.notifications.error('No se pudo abrir el acta');
        if (popup) {
          const status = typeof err?.status === 'number' ? err.status : 'sin código';
          popup.document.body.textContent = `No se pudo abrir el acta (status: ${status}). Verifica tu sesión o la ruta del archivo.`;
        }
      }
    });
  }

  private getSafeFileName(path: string): string | null {
    const candidate = path.split(/[\\/]/).pop()?.trim() ?? '';
    if (!candidate || !/^[A-Za-z0-9._-]+$/.test(candidate)) {
      return null;
    }
    return candidate;
  }

  tieneActa(mov: any): boolean {
    const acta = typeof mov?.acta === 'string' ? mov.acta.trim() : '';
    if (!acta) {
      return false;
    }

    const normalized = acta.toLowerCase();
    return normalized !== 'n/a' && normalized !== 'pendiente';
  }

  puedeReactivar(mov: any): boolean {
    if (this.tieneActa(mov)) {
      return false;
    }

    const estado = String(mov?.asignacion?.estado_asignacion ?? '').trim().toLowerCase();
    return estado === 'cancelado';
  }

  estaReactivando(movimientoId: number): boolean {
    return this.reactivandoIds().has(movimientoId);
  }

  reactivar(mov: any, event: MouseEvent): void {
    event.stopPropagation();

    if (!this.puedeReactivar(mov) || this.estaReactivando(mov.id)) {
      return;
    }

    const dialogRef = this.dialog.open(Dialog, {
      width: '420px',
      data: {
        titulo: 'Reactivar asignación',
        mensaje: `Asignación #${mov.id}`,
        pregunta: 'Se reenviará el correo con un nuevo vencimiento. ¿Deseas continuar?',
      }
    });

    dialogRef.afterClosed().subscribe((confirmar) => {
      if (!confirmar) {
        return;
      }

      this.procesarReactivacion(mov);
    });
  }

  private procesarReactivacion(mov: any): void {
    const nextSet = new Set(this.reactivandoIds());
    nextSet.add(mov.id);
    this.reactivandoIds.set(nextSet);

    const asignacionId = mov?.asignacion?.id ?? mov?.asignacion_id ?? null;
    if (asignacionId === null) {
      const updatedSet = new Set(this.reactivandoIds());
      updatedSet.delete(mov.id);
      this.reactivandoIds.set(updatedSet);
      this.notifications.error('No se encontró el ID de asignación para reactivar.');
      return;
    }

    this.actasService.reactivarAsignacion(asignacionId).pipe(
      finalize(() => {
        const updatedSet = new Set(this.reactivandoIds());
        updatedSet.delete(mov.id);
        this.reactivandoIds.set(updatedSet);
      })
    ).subscribe({
      next: (res: any) => {
        const msg = res?.message || 'Asignación reactivada y correo reenviado.';
        this.notifications.success(msg);
        this.cargarMovimientos();
      },
      error: (err) => {
        console.error('No se pudo reactivar la asignación', err);
        const msg =
          err?.error?.message
          || err?.error?.error
          || 'No se pudo reactivar la asignación. Revisa permisos o estado de la solicitud.';
        this.notifications.error(msg);
      }
    });
  }
}
