import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from './../../../environments/environment';
import { Observable, throwError } from 'rxjs';
import { catchError, map, shareReplay } from 'rxjs/operators';

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
      this.inventarioCache$ = this.http.get<unknown>(this.apiUrl).pipe(
        map((payload) => this.normalizeInventarioResponse(payload)),
        catchError((err) => {
          this.inventarioCache$ = undefined;
          return throwError(() => err);
        }),
        shareReplay({ bufferSize: 1, refCount: false })
      );
    }

    return this.inventarioCache$;
  }

  buscarPorCampo(valor: string, campo: 'serial' | 'placa'): Observable<InventarioModel> {
    const safeValue = encodeURIComponent(valor.trim());
    return this.http.get<InventarioModel>(`${this.apiUrl}/${campo}/${safeValue}`);
  }

  private normalizeInventarioResponse(payload: unknown): InventarioModel[] {
    if (Array.isArray(payload)) {
      return payload as InventarioModel[];
    }

    if (!payload || typeof payload !== 'object') {
      return [];
    }

    const record = payload as Record<string, unknown>;
    const candidates = [record['data'], record['rows'], record['elementos'], record['inventario']];
    const arrayCandidate = candidates.find(Array.isArray);
    return Array.isArray(arrayCandidate) ? (arrayCandidate as InventarioModel[]) : [];
  }
}
