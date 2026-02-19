import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';

export interface DashboardFilters {
  tiendaId?: number | null;
  estados?: string[];
  tipos?: string[];
}

export interface DashboardKpis {
  totalActas: number;
  totalActivos: number;
  disponibles: number;
  responsables: number;
}

export interface DashboardPorTipoItem {
  tipo: string;
  cantidad: number;
}

export interface DashboardPorEstadoItem {
  estado: string;
  cantidad: number;
}

export interface DashboardPorMesItem {
  mes: string | number;
  cantidad: number;
}

export type DashboardMonthlySeries = Array<number | string | null | undefined>;
export type DashboardMonthlyLabels = Array<string | number>;

export interface DashboardStatsResponse {
  kpis: DashboardKpis;
  porTipo: DashboardPorTipoItem[];
  porEstado: DashboardPorEstadoItem[];
  porMes?: DashboardPorMesItem[];
  actasMensuales?: DashboardMonthlySeries;
  meses?: DashboardMonthlyLabels;
  labelsMeses?: DashboardMonthlyLabels;
  labels?: DashboardMonthlyLabels;
  periodos?: DashboardMonthlyLabels;
}

@Injectable({
  providedIn: 'root',
})
export class DashboardService {

  private apiUrl = `${environment.API_URL}/dashboard`;

  constructor(
    private http: HttpClient
  ) { }

  getStats(filter: DashboardFilters = {}): Observable<DashboardStatsResponse> {
    const sanitizedFilter = this.sanitizeFilter(filter);
    let params = new HttpParams();

    if (sanitizedFilter.tiendaId !== null) {
      params = params.set('tiendaId', sanitizedFilter.tiendaId.toString());
    }

    params = this.appendArrayParams(params, sanitizedFilter.estados, 'estados', 'estado');
    params = this.appendArrayParams(params, sanitizedFilter.tipos, 'tipos', 'tipo');

    return this.http.get<DashboardStatsResponse>(`${this.apiUrl}/stats`, { params });
  }

  private appendArrayParams(
    params: HttpParams,
    values: string[],
    pluralKey: string,
    singularKey: string
  ): HttpParams {
    if (values.length === 1) {
      params = params.set(pluralKey, values[0]);
      params = params.set(singularKey, values[0]);
      return params;
    }

    values.forEach((value) => {
      params = params.append(pluralKey, value);
      params = params.append(singularKey, value);
    });

    return params;
  }

  private sanitizeFilter(filter: DashboardFilters) {
    return {
      tiendaId: this.normalizeStoreId(filter.tiendaId),
      estados: this.normalizeArray(filter.estados),
      tipos: this.normalizeArray(filter.tipos),
    };
  }

  private normalizeStoreId(tiendaId?: number | null): number | null {
    if (typeof tiendaId !== 'number') {
      return null;
    }
    return Number.isFinite(tiendaId) ? tiendaId : null;
  }

  private normalizeArray(values?: string[]): string[] {
    return [...new Set(
      (values ?? [])
        .filter((value): value is string => typeof value === 'string')
        .map(value => value.trim())
        .filter(value => value.length > 0)
    )].sort((a, b) => a.localeCompare(b, 'es'));
  }
}
