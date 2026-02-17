import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from './../../../environments/environment';

import { TiendaModel, EstadoModel } from '../models/tienda-estado.model';
import { InventarioModel } from '../models/inventario.model';
import { InventarioService } from './inventario.service';

@Injectable({
  providedIn: 'root',
})
export class TiendaEstadoService {
  private http = inject(HttpClient);
  private inventarioService = inject(InventarioService);
  private apiUrl = environment.API_URL;

  public inventario = signal<InventarioModel[]>([]);

  constructor() {
    this.cargarInventario();
  }

  cargarInventario() {
    this.inventarioService.getInventario();
  }

  // 👇 Estados dinámicos
  public estados = computed(() => {
    return [...new Set(
      this.inventario()
        .map(i => i.estado)
        .filter(Boolean)
    )].sort();
  });

  // 👇 NUEVO → Tipos dinámicos
  public tipos = computed(() => {
    return [...new Set(
      this.inventario()
        .map(i => i.tipo)
        .filter(Boolean)
    )].sort();
  });

  getTienda() {
    return this.http.get<TiendaModel[]>(`${this.apiUrl}/tiendas`)
  }
}
