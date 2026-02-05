import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ActasService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.API_URL}/asignacion`;

  notificarActa(payload: any): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/notificar-asignacion`,
      payload
    );
  }

  confirmarAsignacion(token: string, respuesta: string, notificacion: boolean) {
    return this.http.post(`${this.apiUrl}/confirmar-asignacion`, {
      token,
      respuesta,
      notificacion
    })
  }
}

