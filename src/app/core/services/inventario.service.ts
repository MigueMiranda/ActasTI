import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from './../../../environments/environment';
import { Observable } from 'rxjs';

import { InventarioModel } from '../models/inventario.model';

@Injectable({
  providedIn: 'root',
})
export class InventarioService {

  private http = inject(HttpClient);
  private apiUrl = `${environment.API_URL}/elementos`;

  getInventario(): Observable<InventarioModel[]> {
    return this.http.get<InventarioModel[]>(this.apiUrl);
  }



  buscarPorCampo(valor: string, campo: 'serial' | 'placa'): Observable<InventarioModel> {
    const safeValue = encodeURIComponent(valor.trim());
    return this.http.get<InventarioModel>(`${this.apiUrl}/${campo}/${safeValue}`);
  }
}
