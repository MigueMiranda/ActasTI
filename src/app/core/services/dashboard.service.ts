import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class DashboardService {

  private apiUrl = `${environment.API_URL}/dashboard`;

  constructor(
    private http: HttpClient
  ) { }

  getStats(filter: { tiendaId?: number | null, estados?: string[] }) {
    let params = new HttpParams();

    if (filter.tiendaId) {
      params = params.set('tiendaId', filter.tiendaId.toString());
    }

    if (filter.estados && filter.estados.length > 0) {
      filter.estados.forEach(estado => {
        params = params.append('estados', estado);
      });
    }
    return this.http.get<any>(`${this.apiUrl}/stats`, { params });
  }

}
