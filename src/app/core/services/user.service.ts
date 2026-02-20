import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from './../../../environments/environment';
import { Observable, of, throwError } from 'rxjs';
import { catchError, finalize, map, shareReplay, tap } from 'rxjs/operators';

import { UserModel } from './../models/users.model';

@Injectable({
  providedIn: 'root',
})
export class UserService {

  private http = inject(HttpClient);
  private apiUrl = `${environment.API_URL}/users`;
  private byUsernameCache = new Map<string, UserModel>();
  private byUsernameInFlight = new Map<string, Observable<UserModel>>();

  getAll() {
    return this.http.get<UserModel[]>(this.apiUrl)
  }

  getByUsername(username: string): Observable<UserModel> {
    const cleaned = username.trim();
    const safeUsername = encodeURIComponent(cleaned);
    const cacheKey = cleaned.toLowerCase();

    if (!cleaned) {
      return throwError(() => new Error('Usuario vacio'));
    }

    const cached = this.byUsernameCache.get(cacheKey);
    if (cached) {
      return of(cached);
    }

    const inFlight = this.byUsernameInFlight.get(cacheKey);
    if (inFlight) {
      return inFlight;
    }

    const requests: Array<() => Observable<unknown>> = [
      () => this.http.get<unknown>(`${this.apiUrl}/${safeUsername}`),
      () => this.http.get<unknown>(`${this.apiUrl}`, {
        params: new HttpParams().set('username', cleaned),
      }),
      () => this.http.get<unknown>(`${this.apiUrl}/by-username/${safeUsername}`),
      () => this.http.get<unknown>(`${this.apiUrl}/username/${safeUsername}`),
    ];

    const request$ = this.requestUntilMatch(requests, 0, cleaned).pipe(
      tap((user) => this.byUsernameCache.set(cacheKey, user)),
      finalize(() => this.byUsernameInFlight.delete(cacheKey)),
      shareReplay({ bufferSize: 1, refCount: false })
    );

    this.byUsernameInFlight.set(cacheKey, request$);
    return request$;
  }

  private requestUntilMatch(
    requests: Array<() => Observable<unknown>>,
    index: number,
    expectedUsername: string
  ): Observable<UserModel> {
    if (index >= requests.length) {
      return throwError(() => new Error('Usuario no encontrado'));
    }

    return requests[index]().pipe(
      map((response) => this.normalizeUserResponse(response, expectedUsername)),
      catchError((err) => {
        const status = this.getStatusCode(err);
        if (status === 401 || status === 403 || (status !== null && status >= 500)) {
          return throwError(() => err);
        }
        return this.requestUntilMatch(requests, index + 1, expectedUsername);
      })
    );
  }

  private getStatusCode(error: unknown): number | null {
    if (!error || typeof error !== 'object') {
      return null;
    }

    const status = (error as { status?: unknown }).status;
    return typeof status === 'number' ? status : null;
  }

  private normalizeUserResponse(response: unknown, expectedUsername: string): UserModel {
    const candidates = this.extractUserCandidates(response);
    const expected = this.normalizeUsername(expectedUsername);

    const exactMatch = candidates.find((candidate) => {
      return this.normalizeUsername(candidate.username) === expected;
    });

    if (exactMatch) {
      return exactMatch;
    }

    throw new Error('Respuesta de usuario sin coincidencia exacta');
  }

  private extractUserCandidates(response: unknown): UserModel[] {
    const candidates: unknown[] = [];

    if (Array.isArray(response)) {
      candidates.push(...response);
      return candidates.filter((candidate): candidate is UserModel => this.isUserModel(candidate));
    }

    if (!response || typeof response !== 'object') {
      return [];
    }

    const payload = response as Record<string, unknown>;
    candidates.push(payload);

    const sources = [
      payload['user'],
      payload['usuario'],
      payload['dataValues'],
      payload['data'],
      payload['rows'],
      payload['users'],
      payload['results'],
      payload['result'],
    ];

    for (const source of sources) {
      if (Array.isArray(source)) {
        candidates.push(...source);
      } else if (source && typeof source === 'object') {
        candidates.push(source);
      }
    }

    return candidates.filter((candidate): candidate is UserModel => this.isUserModel(candidate));
  }

  private normalizeUsername(value: string): string {
    return value.trim().toLowerCase();
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
