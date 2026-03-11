import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { ActasService } from './../../../core/services/actas.service';
import { CommonModule } from '@angular/common';
import { finalize } from 'rxjs/operators';
import { MatDialog } from '@angular/material/dialog';
import { Dialog } from '../../../components/dialog/dialog';
import { NotificationService } from '../../../core/services/notification.service';
import { AuthService } from '../../../core/services/auth.service';

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
  private authService = inject(AuthService);
  private readonly userStoreId = this.authService.getUserStoreId();
  private tiendasPorId = new Map<number, string>();
  movimientos = signal<any[]>([]);
  filtroTienda = signal('');
  filtroSerial = signal('');
  filtroResponsable = signal('');
  paginaActual = signal(1);
  itemsPorPagina = 10;
  reactivandoIds = signal<Set<number>>(new Set<number>());

  tiendasDisponibles = computed(() => {
    const mapTiendas = new Map<string, string>();

    this.movimientos().forEach((mov) => {
      const rawName = this.obtenerNombreTienda(mov);
      const normalized = this.normalizarTexto(rawName);
      if (!normalized) {
        return;
      }

      if (!mapTiendas.has(normalized)) {
        mapTiendas.set(normalized, rawName);
      }
    });
    console.log('mapTiendas: ', mapTiendas);

    return Array.from(mapTiendas.values()).sort((a, b) => a.localeCompare(b, 'es'));
  });

  movimientosFiltrados = computed(() => {
    const tienda = this.normalizarTexto(this.filtroTienda());
    const serial = this.normalizarTexto(this.filtroSerial());
    const responsable = this.normalizarTexto(this.filtroResponsable());

    return this.movimientos().filter((mov) => {
      const cumpleSerial = !serial || this.movimientoTieneSerial(mov, serial);
      const cumpleResponsable = !responsable || this.movimientoTieneResponsable(mov, responsable);

      // Busquedas de serial/responsable deben abarcar todos los movimientos.
      if (serial || responsable) {
        return cumpleSerial && cumpleResponsable;
      }

      const cumpleTienda = !tienda || this.normalizarTexto(this.obtenerNombreTienda(mov)).includes(tienda);
      return cumpleTienda;
    });
  });

  movimientosPaginados = computed(() => {
    const ordenados = [...this.movimientosFiltrados()].sort((a, b) => b.id - a.id);
    const inicio = (this.paginaActual() - 1) * this.itemsPorPagina;
    const fin = inicio + this.itemsPorPagina;
    return ordenados.slice(inicio, fin);
  });


  totalPaginas = computed(() => Math.max(1, Math.ceil(this.movimientosFiltrados().length / this.itemsPorPagina)));

  constructor(private actasService: ActasService) { }

  ngOnInit(): void {
    this.cargarTiendas();
    this.cargarMovimientos(this.userStoreId);
  }

  expandedId: number | null = null;

  toggle(id: number) {
    this.expandedId = this.expandedId === id ? null : id;
  }

  cargarMovimientos(tiendaId: number | null = null) {
    this.actasService.getMovimientos(tiendaId).subscribe({
      next: (data: any[]) => {

        console.log('Movimientos: ', data);

        const formateado = data.map((entry) => {
          const grupo = Array.isArray(entry) ? entry : [entry];
          const base = grupo[0] ?? {};

          return {
            ...base,
            elemento: grupo,
            tiendaNombre: this.obtenerNombreTienda(base, grupo),
          };
        });

        this.movimientos.set(formateado);
        this.paginaActual.set(1);
      }
    });
  }

  private cargarTiendas(): void {
    this.actasService.getTiendas().subscribe({
      next: (data) => {
        this.tiendasPorId.clear();
        (Array.isArray(data) ? data : []).forEach((tienda) => {
          const id = this.normalizeNumber(
            tienda?.id
            ?? tienda?.tiendaId
            ?? tienda?.tienda_id
          );
          const nombre = typeof tienda?.nombre === 'string' ? tienda.nombre.trim() : '';
          if (id !== null && nombre) {
            this.tiendasPorId.set(id, nombre);
          }
        });

        if (this.movimientos().length > 0) {
          const reconciliado = this.movimientos().map((mov) => ({
            ...mov,
            tiendaNombre: this.obtenerNombreTienda(mov, Array.isArray(mov?.elemento) ? mov.elemento : []),
          }));
          this.movimientos.set(reconciliado);
        }
      },
      error: () => {
        // Sin catalogo de tiendas se mantiene el fallback existente.
      }
    });
  }


  cambiarPagina(p: number) {
    if (p >= 1 && p <= this.totalPaginas()) {
      this.paginaActual.set(p);
    }
  }

  actualizarFiltro(tipo: 'tienda' | 'serial' | 'responsable', valor: string): void {
    if (tipo === 'tienda') {
      this.filtroTienda.set(valor);
    }
    if (tipo === 'serial') {
      this.filtroSerial.set(valor);
    }
    if (tipo === 'responsable') {
      this.filtroResponsable.set(valor);
    }

    this.paginaActual.set(1);
  }

  limpiarFiltros(): void {
    this.filtroTienda.set('');
    this.filtroSerial.set('');
    this.filtroResponsable.set('');
    this.paginaActual.set(1);
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

  private normalizarTexto(value: unknown): string {
    if (typeof value !== 'string') {
      return '';
    }
    return value
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  private obtenerNombreTienda(mov: any, items: any[] = []): string {
    const candidatos: unknown[] = [
      mov?.tiendaNombre,
      mov?.tienda?.nombre,
      mov?.tienda_nombre,
      mov?.nombreTienda,
      mov?.asignacion?.tienda?.nombre,
      mov?.asignacion?.tienda_nombre,
      mov?.elemento?.tienda?.nombre,
      mov?.elemento?.tienda_nombre,
      mov?.elemento?.nombreTienda,
      mov?.elemento?.tiendaNombre,
    ];

    items.forEach((item) => {
      const nestedElemento = item?.elemento;
      candidatos.push(
        item?.tiendaNombre,
        item?.tienda?.nombre,
        item?.tienda_nombre,
        item?.nombreTienda,
        item?.asignacion?.tienda?.nombre,
        item?.asignacion?.tienda_nombre,
        nestedElemento?.tienda?.nombre,
        nestedElemento?.tienda_nombre,
        nestedElemento?.nombreTienda,
        nestedElemento?.tiendaNombre
      );
    });

    const encontrado = candidatos.find(
      (valor) => typeof valor === 'string' && valor.trim().length > 0
    ) as string | undefined;

    if (encontrado) {
      return encontrado.trim();
    }

    const tiendaId = this.obtenerTiendaId(mov, items);
    if (tiendaId !== null) {
      return this.tiendasPorId.get(tiendaId)?.trim() ?? '';
    }

    return '';
  }

  private obtenerTiendaId(mov: any, items: any[] = []): number | null {
    const candidatos: unknown[] = [
      mov?.tiendaId,
      mov?.tienda_id,
      mov?.tienda?.id,
      mov?.tienda?.tienda_id,
      mov?.asignacion?.tiendaId,
      mov?.asignacion?.tienda_id,
      mov?.asignacion?.tienda?.id,
      mov?.asignacion?.tienda?.tienda_id,
      mov?.elemento?.tiendaId,
      mov?.elemento?.tienda_id,
      mov?.elemento?.tienda?.id,
      mov?.elemento?.tienda?.tienda_id,
    ];

    items.forEach((item) => {
      const nestedElemento = item?.elemento;
      candidatos.push(
        item?.tiendaId,
        item?.tienda_id,
        item?.tienda?.id,
        item?.tienda?.tienda_id,
        item?.asignacion?.tiendaId,
        item?.asignacion?.tienda_id,
        nestedElemento?.tiendaId,
        nestedElemento?.tienda_id,
        nestedElemento?.tienda?.id,
        nestedElemento?.tienda?.tienda_id
      );
    });

    for (const candidato of candidatos) {
      const normalized = this.normalizeNumber(candidato);
      if (normalized !== null) {
        return normalized;
      }
    }

    return null;
  }

  private normalizeNumber(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string') {
      const parsed = Number.parseInt(value, 10);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  }

  private movimientoTieneSerial(mov: any, serialBusqueda: string): boolean {
    const candidatos = new Set<string>();
    const push = (value: unknown) => {
      const normalized = this.normalizarTexto(value);
      if (normalized) {
        candidatos.add(normalized);
      }
    };

    push(mov?.serial);
    push(mov?.elemento?.serial);

    const items = Array.isArray(mov?.elemento) ? mov.elemento : [];
    items.forEach((item: any) => {
      push(item?.serial);
      push(item?.elemento?.serial);
    });

    for (const serial of candidatos) {
      if (serial.includes(serialBusqueda)) {
        return true;
      }
    }

    return false;
  }

  private movimientoTieneResponsable(mov: any, responsableBusqueda: string): boolean {
    const responsable = this.normalizarTexto(
      mov?.users?.name
      ?? mov?.usuario?.name
      ?? mov?.responsable
      ?? mov?.asignacion?.responsable
      ?? ''
    );

    return responsable.includes(responsableBusqueda);
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
