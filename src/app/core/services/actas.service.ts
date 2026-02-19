import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ActasService {
  private http = inject(HttpClient);
  private apiUrl = environment.API_URL;
  private readonly actasRelativeBase = '/public/actas';

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

  getActaPdf(fileName: string): Observable<Blob> {
    const safeName = encodeURIComponent(fileName);
    const candidates = this.buildActaCandidates(safeName);
    return this.tryActaDownload(candidates, 0);
  }

  private getApiOrigin(): string {
    try {
      return new URL(this.apiUrl).origin;
    } catch {
      return globalThis.location?.origin ?? '';
    }
  }

  private buildActaCandidates(safeFileName: string): string[] {
    const origin = this.getApiOrigin();
    const apiPath = this.apiUrl.replace(origin, '');

    const candidates = [
      `${this.apiUrl}${this.actasRelativeBase}/${safeFileName}`,
      `${origin}${this.actasRelativeBase}/${safeFileName}`,
      `${origin}${apiPath}${this.actasRelativeBase}/${safeFileName}`,
    ];

    return [...new Set(candidates)];
  }

  private tryActaDownload(urls: string[], index: number): Observable<Blob> {
    if (index >= urls.length) {
      return throwError(() => new Error('No se pudo descargar el acta desde ninguna ruta conocida'));
    }

    return this.http.get(urls[index], { responseType: 'blob' }).pipe(
      catchError(() => this.tryActaDownload(urls, index + 1))
    );
  }
}

