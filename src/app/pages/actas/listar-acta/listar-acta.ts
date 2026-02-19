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
}
