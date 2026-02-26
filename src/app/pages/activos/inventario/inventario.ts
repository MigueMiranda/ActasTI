import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InventarioModel } from '../../../core/models/inventario.model';
import { InventarioService } from '../../../core/services/inventario.service';
import { catchError, of, switchMap } from 'rxjs';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-inventario',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './inventario.html',
  styleUrls: ['./inventario.scss'],
})
export class InventarioComponent implements OnInit {
  private notifications = inject(NotificationService);
  inventario = signal<InventarioModel[]>([]);
  searchTerm = signal('');
  isLoading = signal(true);

  filterTienda = signal('');
  filterTipo = signal('');
  filterEstado = signal('');
  filterSerial = signal('');
  filterPlaca = signal('');
  filterFabricante = signal('');
  filterModelo = signal('');
  filterResponsable = signal('');

  currentPage = signal(1);
  pageSize = signal(10);

  inventarioFiltrado = computed(() => {
    return this.inventario().filter(item => {
      const matchTienda = !this.filterTienda() || item.tienda.nombre.toString().toLowerCase().includes(this.filterTienda().toLowerCase());
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

  tiendas = computed(() => {
    const unidades = this.inventario().map(item => item.tienda.nombre);
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
    this.cargarInventario();
  }

  cargarInventario(): void {
    this.isLoading.set(true);
    this.inventarioService.getInventario().pipe(
      switchMap((data) => {
        if (data.length > 0) {
          return of(data);
        }
        return this.inventarioService.getInventario(true).pipe(
          catchError(() => of(data))
        );
      })
    ).subscribe({
      next: (data) => {
        this.inventario.set(Array.isArray(data) ? data : []);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('🔴 Error:', err);
        this.notifications.error('No se pudo cargar el inventario');
        this.isLoading.set(false);
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
    this.filterTienda.set('');
    this.filterTipo.set('');
    this.filterEstado.set('');
    this.filterSerial.set('');
    this.filterPlaca.set('');
    this.filterFabricante.set('');
    this.filterModelo.set('');
    this.filterResponsable.set('');
    this.currentPage.set(1);
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
    if (type === 'tienda') this.filterTienda.set(value);
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

  private getTimestamp(): string {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  }
}
