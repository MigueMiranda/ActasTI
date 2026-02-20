import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from './../../../environments/environment';
import { Observable, catchError, of } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';

import { TiendaModel } from '../models/tienda-estado.model';
import { InventarioModel } from '../models/inventario.model';
import { InventarioService } from './inventario.service';

@Injectable({
  providedIn: 'root',
})
export class TiendaEstadoService {
  private http = inject(HttpClient);
  private inventarioService = inject(InventarioService);
  private apiUrl = environment.API_URL;
  private tiendasCache$?: Observable<TiendaModel[]>;

  public inventario = signal<InventarioModel[]>([]);

  constructor() {
    this.cargarInventario();
  }

  cargarInventario() {
    this.inventarioService.getInventario()
      .pipe(
        catchError((err) => {
          console.error('Error cargando inventario para filtros', err);
          return of([] as InventarioModel[]);
        })
      )
      .subscribe((data) => {
        this.inventario.set(Array.isArray(data) ? data : []);
      });
  }

  private hasText(value?: string | null): value is string {
    return typeof value === 'string' && value.trim().length > 0;
  }

  // 👇 Estados dinámicos
  public estados = computed(() => {
    return [...new Set(
      this.inventario()
        .map(i => i.estado)
        .filter(this.hasText)
        .map(estado => estado.trim())
    )].sort();
  });

  // 👇 NUEVO → Tipos dinámicos
  public tipos = computed(() => {
    return [...new Set(
      this.inventario()
        .map(i => i.tipo)
        .filter(this.hasText)
        .map(tipo => tipo.trim())
    )].sort();
  });

  getTienda() {
    if (!this.tiendasCache$) {
      this.tiendasCache$ = this.http.get<TiendaModel[]>(`${this.apiUrl}/tiendas`).pipe(
        map((data) => (Array.isArray(data) ? data : [])),
        shareReplay({ bufferSize: 1, refCount: false })
      );
    }

    return this.tiendasCache$;
  }
}
