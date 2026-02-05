import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

import { InventarioModel } from '../models/inventario.model';

@Injectable({ providedIn: 'root' })
export class ActasService {
  private http = inject(HttpClient);
  private apiUrl = environment.API_URL;

  notificarActa(payload: any): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/asignacion/notificar-asignacion`,
      payload
    );
  }

  confirmarAsignacion(token: string, respuesta: string, notificacion: boolean) {
    return this.http.post(`${this.apiUrl}/asignacion/confirmar-asignacion`, {
      token,
      respuesta,
      notificacion
    })
  }

  getMovimientos() {
    return this.http.get<any[]>(`${this.apiUrl}/movimientos`);
  }
}

