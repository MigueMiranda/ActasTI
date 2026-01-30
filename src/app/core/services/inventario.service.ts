import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from './../../../environments/environment';
import { Observable, tap } from 'rxjs';

import { InventarioModel } from '../models/inventario.model';

@Injectable({
  providedIn: 'root',
})
export class InventarioService {

  private http = inject(HttpClient);
  private apiUrl = `${environment.API_URL}/elementos`;

  getInventario() {
    return this.http
      .get<InventarioModel[]>(this.apiUrl, {
        headers: {
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache'
        }
      })
  }



  buscarPorCampo(valor: string, campo: 'serial' | 'placa' | 'placaAx'): Observable<InventarioModel> | undefined {
    return this.http.get<InventarioModel>(`${this.apiUrl}/${campo}/${valor}`);
  }
}
