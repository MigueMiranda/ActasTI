import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from './../../../environments/environment';

import { TiendaModel, EstadoModel } from '../models/tienda-estado.model';
import { InventarioModel } from '../models/inventario.model';

@Injectable({
  providedIn: 'root',
})
export class TiendaEstadoService {
  private http = inject(HttpClient);
  private apiUrl = environment.API_URL;

  public inventario = signal<InventarioModel[]>([]);



  public estados = computed(() => {
    const estados = this.inventario()
      .map(item => item.estado)
      .filter(Boolean);
    return [...new Set(estados)].sort();
  });

  getTienda() {
    return this.http.get<TiendaModel[]>(`${this.apiUrl}/tiendas`)
  }
}
