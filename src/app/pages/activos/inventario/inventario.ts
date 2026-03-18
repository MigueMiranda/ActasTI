import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InventarioModel } from '../../../core/models/inventario.model';
import { InventarioService } from '../../../core/services/inventario.service';
import { catchError, of, switchMap } from 'rxjs';
import { NotificationService } from '../../../core/services/notification.service';
import { AuthService } from '../../../core/services/auth.service';
import { TiendaEstadoService } from '../../../core/services/tienda-estado.service';
import { TiendaModel } from '../../../core/models/tienda-estado.model';

@Component({
  selector: 'app-inventario',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './inventario.html',
})
export class InventarioComponent implements OnInit {
  private notifications = inject(NotificationService);
  private authService = inject(AuthService);
  private tiendaEstadoService = inject(TiendaEstadoService);
  private readonly userStoreId = this.normalizeStoreId(this.authService.getUserStoreId());
  inventario = signal<InventarioModel[]>([]);
  searchTerm = signal('');
  isLoading = signal(true);

  tiendas = signal<TiendaModel[]>([]);
  filterTienda = signal<number | null>(this.userStoreId);
  filterTipo = signal('');
  filterEstado = signal('');
  filterSerial = signal('');
  filterPlaca = signal('');
  filterFabricante = signal('');
  filterModelo = signal('');
  filterResponsable = signal('');

  currentPage = signal(1);
  pageSize = signal(10);
  skeletonRows = Array.from({ length: 8 });
  storeSelectValue = computed(() => {
    const storeId = this.filterTienda();
    return storeId === null ? '' : String(storeId);
  });

  inventarioFiltrado = computed(() => {
    return this.inventario().filter(item => {
      const storeId = this.filterTienda();
      const itemStoreId = this.getItemStoreId(item);
      const matchTienda = storeId === null || itemStoreId === storeId;
      const matchSerial = !this.filterSerial() || item.serial.toLowerCase().includes(this.filterSerial().toLowerCase());
      const matchPlaca = !this.filterPlaca() || item.placa.toLowerCase().includes(this.filterPlaca().toLowerCase());
      const matchFabricante = !this.filterFabricante() || item.fabricante.toLowerCase().includes(this.filterFabricante().toLowerCase());
      const matchModelo = !this.filterModelo() || item.modelo.toLowerCase().includes(this.filterModelo().toLowerCase());
      const matchResponsable = !this.filterResponsable() || item.usuario.name.toLowerCase().includes(this.filterResponsable().toLowerCase());
      const matchTipo = !this.filterTipo() || item.tipo.toLowerCase().includes(this.filterTipo().toLowerCase());
      const matchEstado = !this.filterEstado() || item.estado?.toLowerCase() === this.filterEstado().toLowerCase();

      return matchTienda && matchSerial && matchPlaca && matchFabricante && matchModelo && matchResponsable && matchTipo && matchEstado;
    });
  });

  // Lista de estados únicos extraída directamente de los datos
  estados = computed(() => {
    const unidades = this.inventario().map(item => item.estado);
    return [...new Set(unidades)].sort();
  });

  paginatedData = computed(() => {
    const startIndex = (this.currentPage() - 1) * this.pageSize();
    return this.inventarioFiltrado().slice(startIndex, startIndex + this.pageSize());
  });

  // Calcula el total de páginas
  totalPages = computed(() => Math.max(1, Math.ceil(this.inventarioFiltrado().length / this.pageSize())));

  constructor(private inventarioService: InventarioService) { }

  ngOnInit(): void {
    this.cargarTiendas();
    this.cargarInventario();
  }

  cargarInventario(forceRefresh = false): void {
    const selectedStoreId = this.filterTienda();
    this.isLoading.set(true);
    this.inventarioService.getInventario(forceRefresh, selectedStoreId).pipe(
      switchMap((data) => {
        if (data.length > 0) {
          return of(data);
        }
        return this.inventarioService.getInventario(true, selectedStoreId).pipe(
          catchError(() => of(data))
        );
      })
    ).subscribe({
      next: (data) => {
        const items = Array.isArray(data) ? data : [];
        const scopedItems = this.aplicarScopeTienda(items, selectedStoreId);
        this.inventario.set(scopedItems);
        this.ensureUserStoreOption(scopedItems);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('🔴 Error:', err);
        this.notifications.error('No se pudo cargar el inventario');
        this.isLoading.set(false);
      }
    });
  }

  cargarTiendas(): void {
    this.tiendaEstadoService.getTienda().subscribe({
      next: (stores) => {
        const normalizedStores = this.normalizeStores(stores);
        this.tiendas.set(normalizedStores);
        this.aplicarTiendaUsuarioSiExiste(normalizedStores);
      },
      error: () => {
        this.notifications.error('No se pudo cargar el listado de tiendas');
      }
    });
  }

  updateSearch(value: string): void {
    this.searchTerm.set(value);
    this.currentPage.set(1); // Reiniciar a página 1 al buscar
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  cleanFilter() {
    this.filterTienda.set(this.userStoreId);
    this.filterTipo.set('');
    this.filterEstado.set('');
    this.filterSerial.set('');
    this.filterPlaca.set('');
    this.filterFabricante.set('');
    this.filterModelo.set('');
    this.filterResponsable.set('');
    this.currentPage.set(1);
    this.cargarInventario();
  }

  downloadFilteredCsv() {
    const rows = this.inventarioFiltrado();
    if (!rows.length) {
      return;
    }

    const headers = ['Tienda', 'Serial', 'Placa', 'Tipo', 'Fabricante', 'Modelo', 'Responsable', 'Ubicacion', 'Estado'];
    const csvRows = rows.map((item) => [
      item.tienda?.nombre ?? '',
      item.serial ?? '',
      item.placa ?? '',
      item.tipo ?? '',
      item.fabricante ?? '',
      item.modelo ?? '',
      item.usuario?.name ?? '',
      item.ubicacion ?? '',
      item.estado ?? '',
    ]);

    const csvContent = [headers, ...csvRows]
      .map((row) => row.map((value) => this.escapeCsvValue(value)).join(','))
      .join('\n');

    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `inventario_filtrado_${this.getTimestamp()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  updateFilter(type: 'tienda' | 'tipo' | 'estado' | 'serial' | 'placa' | 'fabricante' | 'modelo' | 'responsable', value: string) {
    if (type === 'tienda') {
      this.filterTienda.set(this.parseStoreId(value));
      console.log('Tienda seleccionada: ', value);
      this.currentPage.set(1);
      this.cargarInventario(true);
      return;
    }
    if (type === 'tipo') this.filterTipo.set(value);
    if (type === 'estado') this.filterEstado.set(value);
    if (type === 'serial') this.filterSerial.set(value);
    if (type === 'placa') this.filterPlaca.set(value);
    if (type === 'fabricante') this.filterFabricante.set(value);
    if (type === 'modelo') this.filterModelo.set(value);
    if (type === 'responsable') this.filterResponsable.set(value);
    this.currentPage.set(1); // Reset a pág 1 al filtrar
  }

  private escapeCsvValue(value: unknown): string {
    const text = String(value ?? '');
    if (/[",\n]/.test(text)) {
      return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
  }

  private parseStoreId(value: string): number | null {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }

    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return null;
    }

    return Math.trunc(parsed);
  }

  private getItemStoreId(item: InventarioModel): number | null {
    const raw =
      item.tienda?.tienda_id
      ?? (item as any)?.tienda?.id
      ?? (item as any)?.tienda_id
      ?? (item as any)?.tiendaId
      ?? (item as any)?.store_id
      ?? (item as any)?.storeId
      ?? null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : null;
  }

  private aplicarScopeTienda(items: InventarioModel[], tiendaId: number | null): InventarioModel[] {
    if (tiendaId === null) {
      return items;
    }

    return items.filter((item) => this.getItemStoreId(item) === tiendaId);
  }

  private aplicarTiendaUsuarioSiExiste(stores: TiendaModel[]): void {
    if (this.userStoreId === null) {
      return;
    }

    const storeExists = stores.some((store) => {
      const normalizedStoreId = this.normalizeStoreId(
        store.id
        ?? (store as any)?.tienda_id
        ?? (store as any)?.tiendaId
        ?? (store as any)?.store_id
        ?? (store as any)?.storeId
      );
      return normalizedStoreId === this.userStoreId;
    });
    if (!storeExists) {
      return;
    }

    if (this.filterTienda() === this.userStoreId) {
      return;
    }

    this.filterTienda.set(this.userStoreId);
    this.currentPage.set(1);
    this.cargarInventario();
  }

  getStoreOptionValue(store: TiendaModel): string {
    const normalizedStoreId = this.normalizeStoreId(
      store.id
      ?? (store as any)?.tienda_id
      ?? (store as any)?.tiendaId
      ?? (store as any)?.store_id
      ?? (store as any)?.storeId
    );
    return normalizedStoreId === null ? '' : String(normalizedStoreId);
  }

  private normalizeStoreId(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
      return Math.trunc(value);
    }
    if (typeof value === 'string') {
      const parsed = Number(value.trim());
      if (Number.isFinite(parsed) && parsed > 0) {
        return Math.trunc(parsed);
      }
    }
    return null;
  }

  private normalizeStores(stores: TiendaModel[]): TiendaModel[] {
    return (Array.isArray(stores) ? stores : [])
      .map((store) => {
        const id = this.normalizeStoreId(
          store?.id
          ?? (store as any)?.tienda_id
          ?? (store as any)?.tiendaId
          ?? (store as any)?.store_id
          ?? (store as any)?.storeId
        );
        const nombre = typeof store?.nombre === 'string' ? store.nombre.trim() : '';
        return id !== null && nombre
          ? ({ id, nombre } as TiendaModel)
          : null;
      })
      .filter((store): store is TiendaModel => store !== null);
  }

  private ensureUserStoreOption(items: InventarioModel[]): void {
    if (this.userStoreId === null) {
      return;
    }

    const alreadyExists = this.tiendas().some((store) => store.id === this.userStoreId);
    if (alreadyExists) {
      return;
    }

    const fromInventory = items.find((item) => this.getItemStoreId(item) === this.userStoreId);
    const storeName = fromInventory?.tienda?.nombre?.trim();
    if (!storeName) {
      return;
    }

    const nextStores = [...this.tiendas(), { id: this.userStoreId, nombre: storeName }];
    nextStores.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
    this.tiendas.set(nextStores);
  }

  private getTimestamp(): string {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  }
}
