import { Component, OnInit, signal, computed } from '@angular/core';
import { ActasService } from './../../../core/services/actas.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-listar-acta',
  imports: [
    CommonModule,
  ],
  templateUrl: './listar-acta.html',
  styleUrl: './listar-acta.scss',
})
export class ListarActa implements OnInit {
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

  cargarMovimientos() {
    this.actasService.getMovimientos().subscribe({
      next: (data) => {
        this.movimientos.set(data),
          console.log("Datos de movimientos cargados", data)
      },
      error: (err) => console.error('Error cargando movimientos', err)
    });
  }

  cambiarPagina(p: number) {
    if (p >= 1 && p <= this.totalPaginas()) {
      this.paginaActual.set(p);
    }
  }

  verActa(path: string) {
    // Convierte la ruta absoluta del servidor a una URL accesible
    const fileName = path.split('/').pop();
    window.open(`http://localhost:3000/public/actas/${fileName}`, '_blank');
  }
}
