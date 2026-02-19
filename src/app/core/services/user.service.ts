import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from './../../../environments/environment';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { UserModel } from './../models/users.model';

@Injectable({
  providedIn: 'root',
})
export class UserService {

  private http = inject(HttpClient);
  private apiUrl = `${environment.API_URL}/users`;

  getAll() {
    return this.http.get<UserModel[]>(this.apiUrl)
  }

  getByUsername(username: string): Observable<UserModel> {
    const cleaned = username.trim();
    const safeUsername = encodeURIComponent(cleaned);

    const requests: Array<() => Observable<unknown>> = [
      () => this.http.get<unknown>(`${this.apiUrl}/${safeUsername}`),
      () => this.http.get<unknown>(`${this.apiUrl}`, {
        params: new HttpParams().set('username', cleaned),
      }),
      () => this.http.get<unknown>(`${this.apiUrl}/by-username/${safeUsername}`),
      () => this.http.get<unknown>(`${this.apiUrl}/username/${safeUsername}`),
    ];

    return this.requestUntilMatch(requests, 0);
  }

  private requestUntilMatch(
    requests: Array<() => Observable<unknown>>,
    index: number
  ): Observable<UserModel> {
    if (index >= requests.length) {
      return throwError(() => new Error('Usuario no encontrado'));
    }

    return requests[index]().pipe(
      map((response) => this.normalizeUserResponse(response)),
      catchError(() => this.requestUntilMatch(requests, index + 1))
    );
  }

  private normalizeUserResponse(response: unknown): UserModel {
    const candidate = this.extractUserCandidate(response);
    if (this.isUserModel(candidate)) {
      return candidate;
    }

    throw new Error('Respuesta de usuario sin formato esperado');
  }

  private extractUserCandidate(response: unknown): unknown {
    if (Array.isArray(response)) {
      return response[0];
    }

    if (!response || typeof response !== 'object') {
      return response;
    }

    const payload = response as Record<string, unknown>;
    if (payload['user'] && typeof payload['user'] === 'object') {
      return payload['user'];
    }

    if (payload['usuario'] && typeof payload['usuario'] === 'object') {
      return payload['usuario'];
    }

    if (payload['dataValues'] && typeof payload['dataValues'] === 'object') {
      return payload['dataValues'];
    }

    if (Array.isArray(payload['data'])) {
      return payload['data'][0];
    }

    if (payload['data'] && typeof payload['data'] === 'object') {
      return payload['data'];
    }

    return response;
  }

  private isUserModel(value: unknown): value is UserModel {
    if (!value || typeof value !== 'object') {
      return false;
    }

    const user = value as Record<string, unknown>;
    const id = user['id'];
    const hasId = typeof id === 'number' || typeof id === 'string';
    return (
      hasId &&
      typeof user['name'] === 'string' &&
      typeof user['username'] === 'string'
    );
  }

}
