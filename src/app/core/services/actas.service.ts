import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ActasService {
  private http = inject(HttpClient);
  private apiUrl = environment.API_URL;
  private readonly actasRelativeBase = '/public/actas';

  private readonly sessionKey = 'actasti_auth_session';

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

  getMovimientos(tiendaId: number | null = null) {
    let params = new HttpParams();

    if (tiendaId !== null && Number.isFinite(tiendaId) && tiendaId > 0) {
      const value = String(Math.trunc(tiendaId));
      params = params
        .set('tiendaId', value)
        .set('tienda_id', value)
        .set('idTienda', value)
        .set('storeId', value)
        .set('store_id', value);
    }

    return this.http.get<any[]>(`${this.apiUrl}/movimientos`, { params });
  }

  getTiendas(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/tiendas`);
  }

  reactivarAsignacion(asignacionId: number | string): Observable<any> {
    return this.http.post(`${this.apiUrl}/asignacion/reactivar-asignacion`, {
      asignacionId
    });
  }

  reactivarAsignacionPorToken(token: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/asignacion/reactivar-asignacion-token`, {
      token
    });
  }

  getActaUrl(path: string): string | null {
    const normalizedPath = this.normalizeActaPath(path);
    if (!normalizedPath) {
      return null;
    }

    if (this.isAbsoluteUrl(normalizedPath)) {
      return normalizedPath;
    }

    const apiOrigin = this.getApiOrigin();
    const relativePath = this.toRelativeActaPath(normalizedPath);
    if (normalizedPath.startsWith('/') || relativePath.includes('/')) {
      return this.resolveAgainstBase(apiOrigin, normalizedPath.startsWith('/') ? normalizedPath : `/${relativePath}`);
    }

    const fileName = this.extractActaFileName(normalizedPath);
    if (!fileName) {
      return null;
    }

    return this.resolveAgainstBase(apiOrigin, `${this.actasRelativeBase}/${encodeURIComponent(fileName)}`);
  }

  getActaPdf(path: string): Observable<Blob> {
    const candidates = this.buildActaDownloadCandidates(path);
    return this.tryActaDownload(candidates, 0);
  }

  private getApiOrigin(): string {
    try {
      return new URL(this.apiUrl).origin;
    } catch {
      return globalThis.location?.origin ?? '';
    }
  }

  private buildActaDownloadCandidates(path: string): string[] {
    const normalizedPath = this.normalizeActaPath(path);
    if (!normalizedPath) {
      return [];
    }

    const origin = this.getApiOrigin();
    const appOrigin = this.normalizeBaseUrl(globalThis.location?.origin ?? '');
    const apiPath = this.apiUrl.replace(origin, '');
    const candidates: string[] = [];
    const pushCandidate = (url: string | null) => {
      if (url && !candidates.includes(url)) {
        candidates.push(url);
      }
    };

    if (this.isAbsoluteUrl(normalizedPath)) {
      pushCandidate(normalizedPath);
    } else {
      const relativePath = this.toRelativeActaPath(normalizedPath);
      if (normalizedPath.startsWith('/')) {
        pushCandidate(this.resolveAgainstBase(origin, normalizedPath));
        pushCandidate(this.resolveAgainstBase(appOrigin, normalizedPath));
      } else if (relativePath.includes('/')) {
        pushCandidate(this.resolveAgainstBase(origin, `/${relativePath}`));
        pushCandidate(this.resolveAgainstBase(appOrigin, `/${relativePath}`));
      }
    }

    const fileName = this.extractActaFileName(normalizedPath);
    if (!fileName) {
      return candidates;
    }

    const safeName = encodeURIComponent(fileName);

    pushCandidate(`${this.apiUrl}${this.actasRelativeBase}/${safeName}`);
    pushCandidate(`${origin}${this.actasRelativeBase}/${safeName}`);
    pushCandidate(`${origin}${apiPath}${this.actasRelativeBase}/${safeName}`);

    return candidates;
  }

  private tryActaDownload(urls: string[], index: number): Observable<Blob> {
    if (index >= urls.length) {
      return throwError(() => new Error('No se pudo descargar el acta desde ninguna ruta conocida'));
    }

    return this.http.get(urls[index], { responseType: 'blob' }).pipe(
      catchError(() => this.tryActaDownload(urls, index + 1))
    );
  }

  private normalizeActaPath(path: string): string {
    if (typeof path !== 'string') {
      return '';
    }

    return path
      .trim()
      .replace(/^["']|["']$/g, '')
      .replace(/\\/g, '/');
  }

  private toRelativeActaPath(path: string): string {
    return path.replace(/^\.\//, '').replace(/^\/+/, '');
  }

  private extractActaFileName(path: string): string | null {
    const rawCandidate = path
      .split('#', 1)[0]
      .split('?', 1)[0]
      .split('/')
      .pop()
      ?.trim() ?? '';

    if (!rawCandidate) {
      return null;
    }

    try {
      return decodeURIComponent(rawCandidate);
    } catch {
      return rawCandidate;
    }
  }

  private isAbsoluteUrl(path: string): boolean {
    try {
      const url = new URL(path);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  }

  private resolveAgainstBase(base: string, path: string): string | null {
    const normalizedBase = this.normalizeBaseUrl(base);
    if (!normalizedBase) {
      return null;
    }

    try {
      return new URL(path, `${normalizedBase}/`).toString();
    } catch {
      return null;
    }
  }

  private normalizeBaseUrl(value: string): string {
    return value.replace(/\/+$/, '');
  }
}
