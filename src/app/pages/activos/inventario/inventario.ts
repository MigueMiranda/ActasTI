import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InventarioModel } from '../../../core/models/inventario.model';
import { InventarioService } from '../../../core/services/inventario.service';

@Component({
  selector: 'app-inventario',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './inventario.html',
  styleUrls: ['./inventario.scss'],
})
export class InventarioComponent implements OnInit {
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
  totalPages = computed(() => Math.ceil(this.inventarioFiltrado().length / this.pageSize()));

  constructor(private inventarioService: InventarioService) { }

  ngOnInit(): void {
    this.cargarInventario();
  }

  cargarInventario(): void {
    this.isLoading.set(true);
    this.inventarioService.getInventario().subscribe({
      next: (data) => {
        // Asegúrate que 'data' sea el array. Si el backend envía { data: [...] }, usa data.data
        this.inventario.set(Array.isArray(data) ? data : []);
        this.isLoading.set(false);
        console.log('✅ Inventario cargado:', this.inventario());
      },
      error: (err) => {
        console.error('🔴 Error:', err);
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
}