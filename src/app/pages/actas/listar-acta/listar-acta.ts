import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { ActasService } from './../../../core/services/actas.service';
import { CommonModule } from '@angular/common';
import { finalize } from 'rxjs/operators';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { Dialog } from '../../../components/dialog/dialog';
import { NotificationService } from '../../../core/services/notification.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-listar-acta',
  imports: [
    CommonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
  ],
  templateUrl: './listar-acta.html',
})
export class ListarActa implements OnInit {
  private dialog = inject(MatDialog);
  private notifications = inject(NotificationService);
  private authService = inject(AuthService);
  private readonly userStoreId = this.normalizeNumber(this.authService.getUserStoreId());
  private tiendasPorId = new Map<number, string>();
  movimientos = signal<any[]>([]);
  tiendasDisponibles = signal<Array<{ id: number; nombre: string }>>([]);
  filtroTienda = signal<number | null>(this.userStoreId);
  filtroSerial = signal('');
  filtroResponsable = signal('');
  paginaActual = signal(1);
  itemsPorPagina = 10;
  reactivandoIds = signal<Set<number>>(new Set<number>());
  isLoading = signal(false);

  movimientosFiltrados = computed(() => {
    const serial = this.normalizarTexto(this.filtroSerial());
    const responsable = this.normalizarTexto(this.filtroResponsable());
    const tiendaId = this.filtroTienda();

    return this.movimientos().filter((mov) => {
      const items = Array.isArray(mov?.elemento) ? mov.elemento : [];
      const cumpleTienda = tiendaId === null || this.movimientoPerteneceATienda(mov, items, tiendaId);
      const cumpleSerial = !serial || this.movimientoTieneSerial(mov, serial);
      const cumpleResponsable = !responsable || this.movimientoTieneResponsable(mov, responsable);
      return cumpleTienda && cumpleSerial && cumpleResponsable;
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
    this.cargarMovimientos(this.filtroTienda());
  }

  expandedId: number | null = null;

  toggle(id: number) {
    this.expandedId = this.expandedId === id ? null : id;
  }

  cargarMovimientos(tiendaId: number | null = null) {
    this.isLoading.set(true);
    this.actasService.getMovimientos(tiendaId).subscribe({
      next: (data: any[]) => {
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
        this.isLoading.set(false);
      },
      error: () => {
        this.notifications.error('No se pudieron cargar los movimientos');
        this.isLoading.set(false);
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
        const tiendas = Array.from(this.tiendasPorId.entries())
          .map(([id, nombre]) => ({ id, nombre }))
          .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
        this.tiendasDisponibles.set(tiendas);

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

  onTiendaChange(valor: number | null): void {
    this.filtroTienda.set(this.normalizeNumber(valor));
    this.paginaActual.set(1);
    this.cargarMovimientos(this.filtroTienda());
  }

  actualizarFiltro(tipo: 'serial' | 'responsable', valor: string): void {
    if (tipo === 'serial') {
      this.filtroSerial.set(valor);
    }
    if (tipo === 'responsable') {
      this.filtroResponsable.set(valor);
    }

    this.paginaActual.set(1);
  }

  limpiarFiltros(): void {
    this.filtroTienda.set(this.userStoreId);
    this.filtroSerial.set('');
    this.filtroResponsable.set('');
    this.paginaActual.set(1);
    this.cargarMovimientos(this.filtroTienda());
  }

  verActa(path: string, event?: MouseEvent) {
    event?.stopPropagation();

    const actaUrl = this.actasService.getActaUrl(path);
    if (!actaUrl) {
      this.notifications.error('No se pudo abrir el acta');
      return;
    }

    const popup = window.open(actaUrl, '_blank', 'noopener,noreferrer');
    if (!popup) {
      this.notifications.error('El navegador bloqueó la ventana del acta');
    }
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

  private movimientoPerteneceATienda(mov: any, items: any[], tiendaId: number): boolean {
    const resolvedStoreId = this.obtenerTiendaId(mov, items);
    if (resolvedStoreId !== null) {
      return resolvedStoreId === tiendaId;
    }

    const expectedName = this.normalizarTexto(this.tiendasPorId.get(tiendaId) ?? '');
    if (!expectedName) {
      return false;
    }

    return this.normalizarTexto(this.obtenerNombreTienda(mov, items)) === expectedName;
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
        this.cargarMovimientos(this.filtroTienda());
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
