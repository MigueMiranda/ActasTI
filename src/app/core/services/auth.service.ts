import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { environment } from '../../../environments/environment';
import { map, tap } from 'rxjs';

interface AuthSession {
  username: string;
  token: string;
  name: string,
  cargo: string,
  tiendaId: number | null;
  issuedAt: number;
  expiresAt: number;
}

interface AuthUserPayload {
  username?: string;
  name?: string;
  cargo?: string;
  tiendaId?: unknown;
  tienda_id?: unknown;
  idTienda?: unknown;
  storeId?: unknown;
  store_id?: unknown;
  tienda?: {
    id?: unknown;
    tienda_id?: unknown;
  } | unknown;
}

interface AuthLoginResponse {
  token?: string;
  accessToken?: string;
  jwt?: string;
  tiendaId?: unknown;
  tienda_id?: unknown;
  idTienda?: unknown;
  storeId?: unknown;
  store_id?: unknown;
  user?: AuthUserPayload;
  data?: {
    token?: string;
    accessToken?: string;
    jwt?: string;
    tiendaId?: unknown;
    tienda_id?: unknown;
    idTienda?: unknown;
    storeId?: unknown;
    store_id?: unknown;
    user?: AuthUserPayload;
  };
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.API_URL}/auth`;

  private readonly sessionKey = 'actasti_auth_session';
  private readonly sessionDurationMs = 8 * 60 * 60 * 1000;
  private sessionCache: AuthSession | null | undefined = undefined;

  login(username: string, password: string) {
    return this.http.post<AuthLoginResponse>(`${this.apiUrl}/login`, { username, password })
      .pipe(
        map((response) => this.buildSession(response, username)),
        tap((session) => this.saveSession(session)),
      );
  }



  logout(): void {
    this.clearSession();
  }

  isAuthenticated(): boolean {
    const session = this.getSession();
    if (!session) {
      return false;
    }

    if (Date.now() >= session.expiresAt) {
      this.logout();
      return false;
    }

    return true;
  }

  getUsername(): string | null {
    const user = this.getSession()?.name ?? null;
    return user;
  }

  getToken(): string | null {
    return this.getSession()?.token ?? null;
  }

  getUserStoreId(): number | null {
    const session = this.getSession();
    if (!session) {
      return null;
    }

    if (session.tiendaId !== null) {
      return session.tiendaId;
    }

    const storeFromToken = this.getStoreIdFromToken(session.token);
    if (storeFromToken !== null) {
      const updatedSession: AuthSession = {
        ...session,
        tiendaId: storeFromToken,
      };
      this.saveSession(updatedSession);
      return storeFromToken;
    }

    return null;
  }

  private getSession(): AuthSession | null {
    if (this.sessionCache !== undefined) {
      return this.sessionCache;
    }

    const raw = sessionStorage.getItem(this.sessionKey);
    if (!raw) {
      this.sessionCache = null;
      return null;
    }

    try {
      const parsed = JSON.parse(raw) as Partial<AuthSession>;
      if (!parsed || typeof parsed !== 'object') {
        this.clearSession();
        return null;
      }

      const parsedRecord = parsed as Record<string, unknown>;
      const tiendaId =
        this.normalizeStoreId(parsedRecord['tiendaId'])
        ?? this.getStoreIdFromToken(parsedRecord['token']);

      if (
        typeof parsed.username !== 'string' ||
        typeof parsed.name !== 'string' ||
        typeof parsed.cargo !== 'string' ||
        typeof parsed.token !== 'string' ||
        typeof parsed.issuedAt !== 'number' ||
        typeof parsed.expiresAt !== 'number' ||
        parsed.expiresAt <= parsed.issuedAt
      ) {
        this.clearSession();
        return null;
      }

      this.sessionCache = {
        username: parsed.username,
        name: parsed.name,
        cargo: parsed.cargo,
        token: parsed.token,
        issuedAt: parsed.issuedAt,
        expiresAt: parsed.expiresAt,
        tiendaId,
      };
      return this.sessionCache;
    } catch {
      this.clearSession();
      return null;
    }
  }

  private saveSession(session: AuthSession): void {
    this.sessionCache = session;
    sessionStorage.setItem(this.sessionKey, JSON.stringify(session));
  }

  private clearSession(): void {
    this.sessionCache = null;
    sessionStorage.removeItem(this.sessionKey);
  }

  private buildSession(response: AuthLoginResponse, fallbackUsername: string): AuthSession {
    console.time('buildSession');
    const token = this.extractToken(response);
    if (!token) {
      throw new Error('Token no presente en respuesta de login');
    }

    const user = this.extractUser(response);
    const username = this.readString(user?.username, fallbackUsername) ?? fallbackUsername;
    const name = this.readString(user?.name, username) ?? username;
    const cargo = this.readString(user?.cargo, '') ?? '';
    const tiendaId = this.extractStoreId(response, user);
    const now = Date.now();

    console.timeEnd('buildSession');
    return {
      username,
      token,
      name,
      cargo,
      tiendaId,
      issuedAt: now,
      expiresAt: now + this.sessionDurationMs,
    };
  }

  private extractToken(response: AuthLoginResponse): string | null {
    return this.readString(
      response.token,
      response.accessToken,
      response.jwt,
      response.data?.token,
      response.data?.accessToken,
      response.data?.jwt
    );
  }

  private extractUser(response: AuthLoginResponse): AuthUserPayload | null {
    if (response.user && typeof response.user === 'object') {
      return response.user;
    }
    if (response.data?.user && typeof response.data.user === 'object') {
      return response.data.user;
    }
    return null;
  }

  private extractStoreId(response: AuthLoginResponse, user: AuthUserPayload | null): number | null {
    const directCandidates: unknown[] = [
      user?.tiendaId,
      user?.tienda_id,
      user?.idTienda,
      user?.storeId,
      user?.store_id,
      this.readNestedNumberCandidate(user?.tienda, 'id'),
      this.readNestedNumberCandidate(user?.tienda, 'tienda_id'),
      response.tiendaId,
      response.tienda_id,
      response.idTienda,
      response.storeId,
      response.store_id,
      response.data?.tiendaId,
      response.data?.tienda_id,
      response.data?.idTienda,
      response.data?.storeId,
      response.data?.store_id,
      this.readNestedNumberCandidate(response.data?.user?.tienda, 'id'),
      this.readNestedNumberCandidate(response.data?.user?.tienda, 'tienda_id'),
    ];

    for (const candidate of directCandidates) {
      const normalized = this.normalizeStoreId(candidate);
      if (normalized !== null) {
        return normalized;
      }
    }

    const token = this.extractToken(response);
    const payload = this.decodeJwtPayload(token);
    if (!payload) {
      return null;
    }

    const tokenCandidates: unknown[] = [
      payload['tiendaId'],
      payload['tienda_id'],
      payload['idTienda'],
      payload['storeId'],
      payload['store_id'],
      this.readNestedNumberCandidate(payload['tienda'], 'id'),
      this.readNestedNumberCandidate(payload['tienda'], 'tienda_id'),
      payload['tenantId'],
      payload['tenant_id'],
    ];

    for (const candidate of tokenCandidates) {
      const normalized = this.normalizeStoreId(candidate);
      if (normalized !== null) {
        return normalized;
      }
    }

    return null;
  }

  private readNestedNumberCandidate(source: unknown, key: string): unknown {
    if (!source || typeof source !== 'object') {
      return null;
    }
    return (source as Record<string, unknown>)[key];
  }

  private normalizeStoreId(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
      return Math.trunc(value);
    }

    if (typeof value === 'string') {
      const parsed = Number(value.trim());
      if (Number.isFinite(parsed) && parsed > 0) {
        return Math.trunc(parsed);
      }
    }

    return null;
  }

  private decodeJwtPayload(token: string | null): Record<string, unknown> | null {
    if (!token) {
      return null;
    }

    const parts = token.split('.');
    if (parts.length < 2) {
      return null;
    }

    const payload = parts[1]
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    try {
      const decoded = atob(payload.padEnd(Math.ceil(payload.length / 4) * 4, '='));
      const parsed = JSON.parse(decoded);
      return parsed && typeof parsed === 'object'
        ? (parsed as Record<string, unknown>)
        : null;
    } catch {
      return null;
    }
  }

  private getStoreIdFromToken(token: unknown): number | null {
    if (typeof token !== 'string') {
      return null;
    }

    const payload = this.decodeJwtPayload(token);
    if (!payload) {
      return null;
    }

    const candidates: unknown[] = [
      payload['tiendaId'],
      payload['tienda_id'],
      payload['idTienda'],
      payload['storeId'],
      payload['store_id'],
      this.readNestedNumberCandidate(payload['tienda'], 'id'),
      this.readNestedNumberCandidate(payload['tienda'], 'tienda_id'),
      payload['tenantId'],
      payload['tenant_id'],
    ];

    for (const candidate of candidates) {
      const normalized = this.normalizeStoreId(candidate);
      if (normalized !== null) {
        return normalized;
      }
    }

    return null;
  }

  private readString(...values: Array<unknown>): string | null {
    for (const value of values) {
      if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed.length > 0) {
          return trimmed;
        }
      }
    }
    return null;
  }
}
