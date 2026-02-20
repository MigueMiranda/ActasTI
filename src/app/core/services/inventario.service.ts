import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from './../../../environments/environment';
import { Observable } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';

import { InventarioModel } from '../models/inventario.model';

@Injectable({
  providedIn: 'root',
})
export class InventarioService {

  private http = inject(HttpClient);
  private apiUrl = `${environment.API_URL}/elementos`;
  private inventarioCache$?: Observable<InventarioModel[]>;

  getInventario(forceRefresh = false): Observable<InventarioModel[]> {
    if (forceRefresh || !this.inventarioCache$) {
      this.inventarioCache$ = this.http.get<InventarioModel[]>(this.apiUrl).pipe(
        map((data) => (Array.isArray(data) ? data : [])),
        shareReplay({ bufferSize: 1, refCount: false })
      );
    }

    return this.inventarioCache$;
  }

  buscarPorCampo(valor: string, campo: 'serial' | 'placa'): Observable<InventarioModel> {
    const safeValue = encodeURIComponent(valor.trim());
    return this.http.get<InventarioModel>(`${this.apiUrl}/${campo}/${safeValue}`);
  }
}
