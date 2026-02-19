import { Component, OnInit, signal, computed } from '@angular/core';
import { ActasService } from './../../../core/services/actas.service';
import { CommonModule } from '@angular/common';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-listar-acta',
  imports: [
    CommonModule,
  ],
  templateUrl: './listar-acta.html',
  styleUrl: './listar-acta.scss',
})
export class ListarActa implements OnInit {
  private readonly actasBaseUrl = this.getActasBaseUrl();

  movimientos = signal<any[]>([]);
  paginaActual = signal(1);
  itemsPorPagina = 10;

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

  verActa(path: string) {
    const fileName = this.getSafeFileName(path);
    if (!fileName) {
      return;
    }

    const actaUrl = `${this.actasBaseUrl}/public/actas/${encodeURIComponent(fileName)}`;
    window.open(actaUrl, '_blank', 'noopener,noreferrer');
  }

  private getActasBaseUrl(): string {
    try {
      return new URL(environment.API_URL).origin;
    } catch {
      return globalThis.location?.origin ?? '';
    }
  }

  private getSafeFileName(path: string): string | null {
    const candidate = path.split(/[\\/]/).pop()?.trim() ?? '';
    if (!candidate || !/^[A-Za-z0-9._-]+$/.test(candidate)) {
      return null;
    }
    return candidate;
  }
}
