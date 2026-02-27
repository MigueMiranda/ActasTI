import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { environment } from '../../../environments/environment';
import { map, tap } from 'rxjs';

interface AuthSession {
  username: string;
  token: string;
  name: string,
  cargo: string,
  issuedAt: number;
  expiresAt: number;
}

interface AuthUserPayload {
  username?: string;
  name?: string;
  cargo?: string;
}

interface AuthLoginResponse {
  token?: string;
  accessToken?: string;
  jwt?: string;
  user?: AuthUserPayload;
  data?: {
    token?: string;
    accessToken?: string;
    jwt?: string;
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

      this.sessionCache = parsed as AuthSession;
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
    const token = this.extractToken(response);
    if (!token) {
      throw new Error('Token no presente en respuesta de login');
    }

    const user = this.extractUser(response);
    const username = this.readString(user?.username, fallbackUsername) ?? fallbackUsername;
    const name = this.readString(user?.name, username) ?? username;
    const cargo = this.readString(user?.cargo, '') ?? '';
    const now = Date.now();

    return {
      username,
      token,
      name,
      cargo,
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
